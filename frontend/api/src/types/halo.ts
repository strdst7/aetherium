import { MythicIdentitySchema, SymbolicAnchor } from './mythic';

/**
 * Represents a single validation rule within the Sovereign Halo system.
 */
export interface ValidationRule {
  /** Unique identifier for the rule (e.g., "forbidden_behavior") */
  id: string;
  /** Human-readable name of the rule */
  name: string;
  /** Category of the rule */
  category: 'forbidden' | 'tone' | 'symbolic' | 'safety';
  /** Importance weight (0.0 - 1.0), defaults to 1.0 */
  weight: number;
}

/**
 * Represents the result of a single validation check against a rule.
 */
export interface ValidationCheck {
  /** The rule that was checked */
  rule: ValidationRule;
  /** Whether the check passed or failed */
  passed: boolean;
  /** Human-readable result description */
  detail: string;
  /** Confidence score of the check (0.0 - 1.0) */
  confidence: number;
  /** Optional extra data (e.g., matched words, deviation score) */
  metadata?: Record<string, any>;
}

/**
 * Represents an aggregated validation result for a generation attempt.
 */
export interface ValidationReport {
  /** Overall pass/fail status */
  status: 'passed' | 'failed';
  /** All individual checks performed */
  checks: ValidationCheck[];
  /** Number of checks that passed */
  passedCount: number;
  /** Number of checks that failed */
  failedCount: number;
  /** Total number of checks performed */
  totalCount: number;
  /** Weighted average of check confidences */
  confidenceScore: number;
  /** The identity this validation was for */
  identityId: string;
  /** ISO 8601 timestamp of when the validation occurred */
  validatedAt: string;
  /** Which regeneration attempt this report belongs to (1-based) */
  attemptNumber?: number;
}

/**
 * Specific metadata shape for tone deviation checks.
 */
export interface ToneDeviationCheck {
  /** The expected tone register */
  expectedTone: string;
  /** Heuristic-detected tone in output */
  detectedTone: string;
  /** 0.0 (perfect match) to 1.0 (complete mismatch) */
  deviationScore: number;
}

/**
 * Specific metadata shape for symbolic drift checks.
 */
export interface SymbolicDriftCheck {
  /** List of expected anchor concepts */
  expectedAnchors: string[];
  /** Anchors found in output */
  detectedAnchors: string[];
  /** Anchors not found */
  missingAnchors: string[];
  /** 0.0 (no drift) to 1.0 (complete drift) */
  driftScore: number;
}

/**
 * Returned when all regeneration attempts are exhausted and the output still fails.
 */
export interface FailureReport {
  /** Always 'failed' for a FailureReport */
  status: 'failed';
  /** Number of regeneration attempts made */
  attemptCount: number;
  /** Concise list of persistent violations */
  violationSummary: string[];
  /** Safe message for caller (never contains unvalidated output) */
  safeFallbackMessage: string;
  /** The report from the final failed attempt */
  lastValidationReport: ValidationReport;
  /** The identity this validation was for */
  identityId: string;
  /** ISO 8601 timestamp */
  generatedAt: string;
}

/**
 * Options for configuring Sovereign Halo validation behavior.
 */
export interface HaloValidationOptions {
  /** Maximum number of regeneration attempts (default 3) */
  maxAttempts?: number;
  /** Temperature reduction per attempt (default 0.1) */
  temperaturePenalty?: number;
  /** Whether to require symbolic anchors (default true) */
  requireSymbolicAnchors?: boolean;
  /** Deviation threshold before flagging (default 0.5) */
  toneTolerance?: number;
  /** Whether to skip safety checks (default false) */
  skipSafetyCheck?: boolean;
}

/**
 * Computes the weighted confidence score for a set of validation checks.
 * 
 * @param checks Array of ValidationCheck objects
 * @returns Weighted average confidence score (0.0 - 1.0)
 */
export function computeConfidenceScore(checks: ValidationCheck[]): number {
  if (checks.length === 0) return 1.0;
  
  let totalWeight = 0;
  let weightedConfidence = 0;
  
  for (const check of checks) {
    const weight = check.rule.weight ?? 1.0;
    totalWeight += weight;
    weightedConfidence += check.confidence * weight;
  }
  
  return totalWeight === 0 ? 1.0 : weightedConfidence / totalWeight;
}

/**
 * Returns the default options for Halo validation.
 * 
 * @returns Default HaloValidationOptions
 */
export function getDefaultHaloOptions(): HaloValidationOptions {
  return {
    maxAttempts: 3,
    temperaturePenalty: 0.1,
    requireSymbolicAnchors: true,
    toneTolerance: 0.5,
    skipSafetyCheck: false,
  };
}
