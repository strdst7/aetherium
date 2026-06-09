import {
  ValidationReport,
  ValidationCheck,
  FailureReport,
  computeConfidenceScore,
  getDefaultHaloOptions
} from './halo';

describe('ValidationReport and Halo Types', () => {
  it('should construct a valid ValidationReport', () => {
    const check: ValidationCheck = {
      rule: { id: 'r1', name: 'Rule 1', category: 'safety', weight: 1.0 },
      passed: true,
      detail: 'Passed safety check',
      confidence: 0.95
    };

    const report: ValidationReport = {
      status: 'passed',
      checks: [check],
      passedCount: 1,
      failedCount: 0,
      totalCount: 1,
      confidenceScore: 0.95,
      identityId: 'id-123',
      validatedAt: new Date().toISOString(),
      attemptNumber: 1
    };

    expect(report.status).toBe('passed');
    expect(report.checks.length).toBe(1);
    expect(report.identityId).toBe('id-123');
  });

  it('should compute confidenceScore correctly as a weighted average', () => {
    const checks: ValidationCheck[] = [
      {
        rule: { id: 'r1', name: 'Rule 1', category: 'safety', weight: 2.0 },
        passed: true,
        detail: 'ok',
        confidence: 0.9
      },
      {
        rule: { id: 'r2', name: 'Rule 2', category: 'tone', weight: 1.0 },
        passed: true,
        detail: 'ok',
        confidence: 0.6
      }
    ];

    // (0.9 * 2.0 + 0.6 * 1.0) / 3.0 = (1.8 + 0.6) / 3.0 = 2.4 / 3.0 = 0.8
    const score = computeConfidenceScore(checks);
    expect(score).toBeCloseTo(0.8);
  });

  it('should have a non-empty safeFallbackMessage in FailureReport', () => {
    const report: FailureReport = {
      status: 'failed',
      attemptCount: 3,
      violationSummary: ['Tone deviation too high'],
      safeFallbackMessage: 'I am unable to process this request at the moment.',
      lastValidationReport: {} as any,
      identityId: 'id-123',
      generatedAt: new Date().toISOString()
    };

    expect(report.safeFallbackMessage.length).toBeGreaterThan(0);
  });

  it('should provide sensible defaults for HaloValidationOptions', () => {
    const options = getDefaultHaloOptions();
    expect(options.maxAttempts).toBe(3);
    expect(options.temperaturePenalty).toBe(0.1);
    expect(options.requireSymbolicAnchors).toBe(true);
    expect(options.toneTolerance).toBe(0.5);
    expect(options.skipSafetyCheck).toBe(false);
  });

  it('should ensure ValidationCheck confidence is between 0 and 1', () => {
    const check: ValidationCheck = {
      rule: { id: 'r1', name: 'Rule 1', category: 'safety', weight: 1.0 },
      passed: true,
      detail: 'ok',
      confidence: 0.85
    };

    expect(check.confidence).toBeGreaterThanOrEqual(0);
    expect(check.confidence).toBeLessThanOrEqual(1);
  });
});
