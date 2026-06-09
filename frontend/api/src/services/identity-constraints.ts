import { SigilIdentity } from '../types/identity';

export interface RuleCheck {
  rule: string;
  passed: boolean;
  detail?: string;
}

export interface IdentityConstraintViolation {
  rule: string;
  message: string;
}

export interface IdentityConstraintResult {
  passed: boolean;
  violations: IdentityConstraintViolation[];
  ruleChecks: RuleCheck[];
}

/**
 * Evaluates text outputs against the rules defined in a SigilIdentity.
 */
export class IdentityConstraintEngine {
  /**
   * Evaluates the given output against the identity's rules.
   * 
   * @param output The text output to evaluate
   * @param identity The identity containing the rules
   * @returns The result of the constraint evaluation
   */
  evaluate(output: string, identity: SigilIdentity): IdentityConstraintResult {
    const ruleChecks: RuleCheck[] = [];
    const violations: IdentityConstraintViolation[] = [];
    const outputLower = output.toLowerCase();

    for (const rule of identity.rules) {
      let passed = true;
      let detail = 'Rule passed';

      // CR-02 Fix: Use slice to avoid truncating multi-colon values
      if (rule.toLowerCase().startsWith('must contain:')) {
        const required = rule.split(':').slice(1).join(':').trim().toLowerCase();
        if (required && !outputLower.includes(required)) {
          passed = false;
          detail = `Missing required content: ${required}`;
        }
      } else if (rule.toLowerCase().startsWith('must not contain:')) {
        const forbidden = rule.split(':').slice(1).join(':').trim().toLowerCase();
        if (forbidden && outputLower.includes(forbidden)) {
          passed = false;
          detail = `Contains forbidden content: ${forbidden}`;
        }
      }

      ruleChecks.push({ rule, passed, detail });
      if (!passed) {
        violations.push({ rule, message: detail });
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      ruleChecks
    };
  }
}
