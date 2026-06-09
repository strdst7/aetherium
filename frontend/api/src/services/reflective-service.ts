import { SigilIdentity } from '../types/identity';

export interface Violation {
  rule: string;
  message: string;
}

export interface RuleCheck {
  rule: string;
  passed: boolean;
  detail?: string;
}

export interface ReflectiveCheckResult {
  status: "approved" | "refine" | "reject";
  violations: Violation[];
  suggestedConstraints: any[];
  confidenceScore: number;
  identityRuleChecks?: RuleCheck[];
}

/**
 * ReflectiveService
 * 
 * Legacy validation service from Phase 5. Maintained for backward compatibility
 * and as a fallback when SovereignHaloService is not injected.
 */
export class ReflectiveService {
  evaluate(candidate: any, memories: any[], identity?: SigilIdentity): ReflectiveCheckResult {
    const text = (candidate.text || candidate || "").toLowerCase();
    const violations: Violation[] = [];
    const ruleChecks: RuleCheck[] = [];

    if (identity) {
      for (const rule of identity.rules) {
        let passed = true;
        let detail = 'Rule passed';

        if (rule.toLowerCase().startsWith('must contain:')) {
          const required = rule.split(':').slice(1).join(':').trim().toLowerCase();
          if (required && !text.includes(required)) {
            passed = false;
            detail = `Missing required content: ${required}`;
          }
        } else if (rule.toLowerCase().startsWith('must not contain:')) {
          const forbidden = rule.split(':').slice(1).join(':').trim().toLowerCase();
          if (forbidden && text.includes(forbidden)) {
            passed = false;
            detail = `Contains forbidden content: ${forbidden}`;
          }
        }

        ruleChecks.push({ rule, passed, detail });
        if (!passed) {
          violations.push({ rule, message: detail });
        }
      }
    }

    const status = violations.length > 0 ? "refine" : "approved";
    const confidenceScore = violations.length > 0 ? 0.5 : 1.0;

    return {
      status,
      violations,
      suggestedConstraints: violations.map(v => v.message),
      confidenceScore,
      identityRuleChecks: ruleChecks
    };
  }
}
