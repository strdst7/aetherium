import { SigilIdentity } from "../types/identity";

export interface RuleCheck {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface IdentityConstraintViolation {
  rule: string;
  severity: "error" | "warning";
  message: string;
}

export interface IdentityConstraintResult {
  passed: boolean;
  violations: IdentityConstraintViolation[];
  ruleChecks: RuleCheck[];
}

/**
 * IdentityConstraintEngine evaluates LLM outputs against identity rules.
 * 
 * Supported rule formats:
 * - "must contain: X" — checks if output contains X
 * - "must not contain: X" — checks if output does NOT contain X
 * - "tone: X" — validates tone matches (simple string check)
 * - Any other rule → logged as "unknown rule type"
 */
export class IdentityConstraintEngine {
  /**
   * Evaluate an output against an identity's rules.
   */
  evaluate(output: string, identity: SigilIdentity): IdentityConstraintResult {
    const violations: IdentityConstraintViolation[] = [];
    const ruleChecks: RuleCheck[] = [];
    const rules = identity.config?.customRules || [];

    for (const rule of rules) {
      const trimmedRule = rule.trim().toLowerCase();
      const outputLower = output.toLowerCase();

      if (trimmedRule.startsWith("must contain:")) {
        const required = rule.split(":")[1]?.trim() || "";
        const passed = outputLower.includes(required.toLowerCase());
        ruleChecks.push({
          rule,
          passed,
          detail: passed ? `Output contains "${required}"` : `Output missing "${required}"`,
        });
        if (!passed) {
          violations.push({
            rule,
            severity: "error",
            message: `Output must contain "${required}"`,
          });
        }
      } else if (trimmedRule.startsWith("must not contain:")) {
        const forbidden = rule.split(":")[1]?.trim() || "";
        const passed = !outputLower.includes(forbidden.toLowerCase());
        ruleChecks.push({
          rule,
          passed,
          detail: passed ? `Output does not contain "${forbidden}"` : `Output contains forbidden text "${forbidden}"`,
        });
        if (!passed) {
          violations.push({
            rule,
            severity: "error",
            message: `Output must not contain "${forbidden}"`,
          });
        }
      } else if (trimmedRule.startsWith("tone:")) {
        const tone = rule.split(":")[1]?.trim() || "";
        // Simple check: verify tone keyword appears in output
        const passed = outputLower.includes(tone.toLowerCase());
        ruleChecks.push({
          rule,
          passed,
          detail: passed ? `Output reflects "${tone}" tone` : `Output missing "${tone}" tone`,
        });
        if (!passed) {
          violations.push({
            rule,
            severity: "warning",
            message: `Output should reflect "${tone}" tone`,
          });
        }
      } else {
        // Unknown rule type
        ruleChecks.push({
          rule,
          passed: true,
          detail: `Unknown rule type: "${rule}" — not enforced`,
        });
        console.warn(`[IdentityConstraintEngine] Unknown rule: "${rule}"`);
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      ruleChecks,
    };
  }
}
