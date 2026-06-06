/**
 * Sovereign Halo Types
 * 
 * Validation contracts, reports, and failure types for the Sovereign Halo
 * output validation and enforcement layer.
 */

export interface ValidationRule {
  id: string;
  name: string;
  category: 'forbidden' | 'tone' | 'symbolic' | 'safety';
  weight: number;
}

export interface ValidationCheck {
  rule: ValidationRule;
  passed: boolean;
  detail: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface ValidationReport {
  status: 'passed' | 'failed';
  checks: ValidationCheck[];
  passedCount: number;
  failedCount: number;
  totalCount: number;
  confidenceScore: number;
  identityId: string;
  validatedAt: string;
  attemptNumber?: number;
}

export interface ToneDeviationCheck {
  expectedTone: string;
  detectedTone: string;
  deviationScore: number;
}

export interface SymbolicDriftCheck {
  expectedAnchors: string[];
  detectedAnchors: string[];
  missingAnchors: string[];
  driftScore: number;
}

export interface FailureReport {
  status: 'failed';
  attemptCount: number;
  violationSummary: string[];
  safeFallbackMessage: string;
  lastValidationReport: ValidationReport;
  identityId: string;
  generatedAt: string;
}

export interface HaloValidationOptions {
  maxAttempts?: number;
  temperaturePenalty?: number;
  requireSymbolicAnchors?: boolean;
  toneTolerance?: number;
  skipSafetyCheck?: boolean;
}

/**
 * Compute weighted confidence score from validation checks.
 * Returns 0 if there are no checks or no weights.
 */
export function computeConfidenceScore(checks: ValidationCheck[]): number {
  if (checks.length === 0) return 0;
  
  const totalWeight = checks.reduce((sum, check) => sum + check.rule.weight, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = checks.reduce((sum, check) => sum + check.confidence * check.rule.weight, 0);
  return weightedSum / totalWeight;
}

/**
 * Default validation options.
 */
export const DEFAULT_HALO_OPTIONS: HaloValidationOptions = {
  maxAttempts: 3,
  temperaturePenalty: 0.1,
  requireSymbolicAnchors: true,
  toneTolerance: 0.5,
  skipSafetyCheck: false,
};

/**
 * Maximum regeneration attempts for Sovereign Halo.
 */
export const MAX_HALO_ATTEMPTS = 3;
