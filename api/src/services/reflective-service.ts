import { VectorSearchResult } from "./memory-service";
import { OrchestratorContext } from "./orchestrator";

export interface Violation {
  rule: string;
  severity: "warning" | "error";
  message: string;
}

export interface ReflectiveCheckResult {
  status: "approved" | "refine" | "reject";
  violations: Violation[];
  suggestedConstraints: any[];
  confidenceScore: number;
}

export class ReflectiveService {
  /**
   * Upgraded evaluation logic as per user specification.
   * Detects sigil geometry violations and identity contradictions.
   */
  evaluate(candidate: any, memories: VectorSearchResult[]): { status: string; violations: Violation[] } {
    const text = (candidate.text || candidate || "").toLowerCase();
    const violations: Violation[] = [];

    // 1. Sigil geometry violation
    if (text.includes("rotate the sigil") || text.includes("flip the sigil")) {
      violations.push({
        rule: "RULE_GEO_INTEGRITY",
        severity: "error",
        message: "Candidate proposes altering canonical Sigil geometry."
      });
    }

    // 2. Identity contradiction
    // Note: We check m.doc.metadata for identity_score to match our service structure
    const highIdentity = memories.filter(m => (m.doc.metadata?.identity_score ?? 0) >= 0.9);
    for (const mem of highIdentity) {
      if (text.includes("halo arc is square")) {
        violations.push({
          rule: "RULE_IDENTITY_CONTRADICTION",
          severity: "error",
          message: "Contradicts high‑identity memory: Halo Arc ratio must be 1:1.618."
        });
      }
    }

    return violations.length
      ? { status: "refine", violations }
      : { status: "approved", violations: [] };
  }

  /**
   * Main check method used by the Orchestrator.
   * Wraps the upgrade evaluate logic for system compatibility.
   */
  async check(
    candidate: string,
    context: OrchestratorContext
  ): Promise<ReflectiveCheckResult> {
    const result = this.evaluate({ text: candidate }, context.relevantMemories);
    
    return {
      status: result.status as "approved" | "refine" | "reject",
      violations: result.violations,
      suggestedConstraints: [],
      confidenceScore: result.status === "approved" ? 0.95 : 0.2
    };
  }
}
