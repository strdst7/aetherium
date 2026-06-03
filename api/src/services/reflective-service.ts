import { OrchestratorContext } from "./orchestrator";

export interface Violation {
  type: "sigil-geometry-alteration" | "memory-contradiction" | "other";
  severity: "warning" | "error";
  message: string;
  detectedIn: string;
}

export interface SuggestedConstraint {
  constraint: string;
  rationale: string;
}

export interface ReflectiveCheckResult {
  status: "approved" | "refine" | "reject";
  violations: Violation[];
  suggestedConstraints: SuggestedConstraint[];
  confidenceScore: number;
}

export class ReflectiveService {
  private sigilAlterationKeywords = ["rotate", "flip", "mirror", "transform", "alter", "modify", "change geometry"];
  private contradictionThreshold = 0.7; // String similarity threshold

  async check(
    candidate: string,
    context: OrchestratorContext
  ): Promise<ReflectiveCheckResult> {
    const violations: Violation[] = [];
    const suggestedConstraints: SuggestedConstraint[] = [];
    let confidenceScore = 1.0;

    // Rule 1: Check for Sigil geometry alteration suggestions
    const sigilViolations = this.checkSigilGeometryAlteration(candidate);
    violations.push(...sigilViolations);

    // Rule 2: Check for memory contradictions
    const contradictions = this.checkMemoryContradictions(candidate, context);
    violations.push(...contradictions);

    // Determine status based on violations
    let status: "approved" | "refine" | "reject" = "approved";
    if (violations.some((v) => v.severity === "error")) {
      status = "reject";
      confidenceScore = 0.2;
    } else if (violations.some((v) => v.severity === "warning")) {
      status = "refine";
      confidenceScore = 0.6;
    } else {
      confidenceScore = 0.95;
    }

    // Generate suggested constraints based on violations
    if (violations.length > 0) {
      suggestedConstraints.push(...this.generateConstraints(violations, context));
    }

    return {
      status,
      violations,
      suggestedConstraints,
      confidenceScore,
    };
  }

  private checkSigilGeometryAlteration(candidate: string): Violation[] {
    const violations: Violation[] = [];
    const candidateLower = candidate.toLowerCase();

    for (const keyword of this.sigilAlterationKeywords) {
      if (candidateLower.includes(keyword)) {
        // Check context to avoid false positives
        const regex = new RegExp(`\\b${keyword}\\b`, "gi");
        const matches = candidate.match(regex);

        if (matches && matches.length > 0) {
          violations.push({
            type: "sigil-geometry-alteration",
            severity: "error",
            message: `Detected potential Sigil geometry alteration: "${keyword}" in response`,
            detectedIn: candidate.substring(
              Math.max(0, candidate.toLowerCase().indexOf(keyword) - 30),
              Math.min(candidate.length, candidate.toLowerCase().indexOf(keyword) + keyword.length + 30)
            ),
          });
        }
      }
    }

    return violations;
  }

  private checkMemoryContradictions(
    candidate: string,
    context: OrchestratorContext
  ): Violation[] {
    const violations: Violation[] = [];

    // Extract key facts from high-identity memories
    for (const memory of context.relevantMemories) {
      if (memory.score > 0.7) {
        // High-identity threshold
        const facts = this.extractFacts(memory.doc.content);

        for (const fact of facts) {
          if (this.contradicts(candidate, fact)) {
            violations.push({
              type: "memory-contradiction",
              severity: "warning",
              message: `Candidate response may contradict high-confidence memory: "${memory.doc.id}"`,
              detectedIn: `Memory fact: "${fact}" | Candidate suggests: "${this.findContradictingSegment(
                candidate,
                fact
              )}"`,
            });
          }
        }
      }
    }

    return violations;
  }

  private extractFacts(content: string): string[] {
    // Simple fact extraction: split on periods and take key phrases
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 5);
    return sentences.slice(0, 3).map((s) => s.trim());
  }

  private contradicts(candidate: string, fact: string): boolean {
    const candidateLower = candidate.toLowerCase();
    const factLower = fact.toLowerCase();

    // Simple contradiction detection: negative assertions about positive facts
    const negationKeywords = ["not ", "no ", "never ", "cannot", "don't", "doesn't", "isn't"];

    for (const negation of negationKeywords) {
      if (
        candidateLower.includes(negation) &&
        this.stringSimilarity(candidateLower, factLower) > this.contradictionThreshold
      ) {
        return true;
      }
    }

    return false;
  }

  private findContradictingSegment(candidate: string, fact: string): string {
    // Find the segment in candidate that relates to the fact
    const words = fact.split(" ");
    const mainKeyword = words.find((w) => w.length > 3) || words[0];

    const regex = new RegExp(`[^.]*${mainKeyword}[^.]*`, "gi");
    const matches = candidate.match(regex);

    return matches?.[0]?.trim() || candidate.substring(0, 100);
  }

  private stringSimilarity(a: string, b: string): number {
    // Simple Jaccard similarity
    const setA = new Set(a.split(" "));
    const setB = new Set(b.split(" "));

    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }

  private generateConstraints(
    violations: Violation[],
    context: OrchestratorContext
  ): SuggestedConstraint[] {
    const constraints: SuggestedConstraint[] = [];

    const hasGeometryViolation = violations.some((v) => v.type === "sigil-geometry-alteration");
    if (hasGeometryViolation) {
      constraints.push({
        constraint: "CONSTRAINT_SIGIL_IMMUTABLE",
        rationale: "Sigil geometry must remain invariant. Do not suggest modifications to core sigil structure.",
      });
    }

    const hasContradictions = violations.some((v) => v.type === "memory-contradiction");
    if (hasContradictions) {
      constraints.push({
        constraint: "CONSTRAINT_MEMORY_COHERENCE",
        rationale: "Responses must align with high-confidence memories. Verify facts before contradicting established knowledge.",
      });
    }

    if (violations.length >= 2) {
      constraints.push({
        constraint: "CONSTRAINT_INVOKE_REFINEMENT",
        rationale: "Multiple violations detected. Recommend regenerating response with tighter guardrails.",
      });
    }

    return constraints;
  }
}
