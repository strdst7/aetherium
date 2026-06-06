import { VectorSearchResult } from "./memory-service";
import { OrchestratorContext } from "./orchestrator";
import { SigilIdentity } from "../types/identity";
import { IdentityConstraintEngine, RuleCheck } from "./identity-constraints";

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
  identityRuleChecks?: RuleCheck[];
}

export class ReflectiveService {
  private constraintEngine: IdentityConstraintEngine;

  constructor() {
    this.constraintEngine = new IdentityConstraintEngine();
  }

  /**
   * Upgraded evaluation logic as per user specification.
   * Detects sigil geometry violations and identity contradictions.
   * Optionally evaluates identity constraints if identity is provided.
   */
  evaluate(
    candidate: any,
    memories: VectorSearchResult[],
    identity?: SigilIdentity
  ): { status: string; violations: Violation[]; identityRuleChecks?: RuleCheck[] } {
    const text = (candidate.text || candidate || "").toLowerCase();
    const violations: Violation[] = [];
    let identityRuleChecks: RuleCheck[] | undefined;

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

    // 3. Identity constraints (if identity provided)
    if (identity) {
      const constraintResult = this.constraintEngine.evaluate(text, identity);
      if (constraintResult.violations.length > 0) {
        violations.push(...constraintResult.violations);
      }
      identityRuleChecks = constraintResult.ruleChecks;
    }

    return violations.length
      ? { status: "refine", violations, identityRuleChecks }
      : { status: "approved", violations: [], identityRuleChecks };
  }

  /**
   * Main check method used by the Orchestrator.
   * Wraps the upgrade evaluate logic for system compatibility.
   */
  async check(
    candidate: string,
    context: OrchestratorContext,
    identity?: SigilIdentity
  ): Promise<ReflectiveCheckResult> {
    const result = this.evaluate({ text: candidate }, context.relevantMemories, identity);
    
    return {
      status: result.status as "approved" | "refine" | "reject",
      violations: result.violations,
      suggestedConstraints: [],
      confidenceScore: result.status === "approved" ? 0.95 : 0.2,
      identityRuleChecks: result.identityRuleChecks,
    };
  }
}
