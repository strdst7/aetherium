import {
  ValidationRule,
  ValidationCheck,
  ValidationReport,
  FailureReport,
  ToneDeviationCheck,
  SymbolicDriftCheck,
  HaloValidationOptions,
  DEFAULT_HALO_OPTIONS,
  MAX_HALO_ATTEMPTS,
  computeConfidenceScore,
} from "./halo";

describe("ValidationReport", () => {
  it("can be constructed with all fields", () => {
    const rule: ValidationRule = {
      id: "test-rule",
      name: "Test Rule",
      category: "forbidden",
      weight: 1.0,
    };

    const check: ValidationCheck = {
      rule,
      passed: true,
      detail: "All clear",
      confidence: 1.0,
    };

    const report: ValidationReport = {
      status: "passed",
      checks: [check],
      passedCount: 1,
      failedCount: 0,
      totalCount: 1,
      confidenceScore: 1.0,
      identityId: "identity_123",
      validatedAt: new Date().toISOString(),
      attemptNumber: 1,
    };

    expect(report.status).toBe("passed");
    expect(report.checks.length).toBe(1);
    expect(report.confidenceScore).toBe(1.0);
    expect(report.identityId).toBe("identity_123");
    expect(report.attemptNumber).toBe(1);
  });

  it("confidenceScore is computed correctly as weighted average", () => {
    const rule1: ValidationRule = { id: "r1", name: "Rule 1", category: "forbidden", weight: 1.0 };
    const rule2: ValidationRule = { id: "r2", name: "Rule 2", category: "tone", weight: 0.5 };

    const checks: ValidationCheck[] = [
      { rule: rule1, passed: true, detail: "OK", confidence: 1.0 },
      { rule: rule2, passed: true, detail: "OK", confidence: 0.5 },
    ];

    const score = computeConfidenceScore(checks);
    // (1.0 * 1.0 + 0.5 * 0.5) / (1.0 + 0.5) = 1.25 / 1.5 = 0.833...
    expect(score).toBeCloseTo(0.833, 3);
  });

  it("returns 0 for empty checks array", () => {
    expect(computeConfidenceScore([])).toBe(0);
  });

  it("returns 0 when total weight is 0", () => {
    const rule: ValidationRule = { id: "r", name: "Rule", category: "safety", weight: 0 };
    const check: ValidationCheck = { rule, passed: true, detail: "OK", confidence: 0.5 };
    expect(computeConfidenceScore([check])).toBe(0);
  });
});

describe("FailureReport", () => {
  it("has a non-empty safeFallbackMessage", () => {
    const report: ValidationReport = {
      status: "failed",
      checks: [],
      passedCount: 0,
      failedCount: 0,
      totalCount: 0,
      confidenceScore: 0,
      identityId: "identity_123",
      validatedAt: new Date().toISOString(),
    };

    const failure: FailureReport = {
      status: "failed",
      attemptCount: 3,
      violationSummary: ["Violation 1"],
      safeFallbackMessage: "The generation could not satisfy identity constraints.",
      lastValidationReport: report,
      identityId: "identity_123",
      generatedAt: new Date().toISOString(),
    };

    expect(failure.safeFallbackMessage).toBeTruthy();
    expect(failure.safeFallbackMessage.length).toBeGreaterThan(0);
    expect(failure.attemptCount).toBe(3);
    expect(failure.violationSummary.length).toBeGreaterThan(0);
  });
});

describe("ValidationCheck", () => {
  it("confidence is between 0 and 1", () => {
    const rule: ValidationRule = { id: "r", name: "Rule", category: "tone", weight: 1.0 };
    const check: ValidationCheck = { rule, passed: true, detail: "OK", confidence: 0.8 };
    expect(check.confidence).toBeGreaterThanOrEqual(0);
    expect(check.confidence).toBeLessThanOrEqual(1);
  });
});

describe("HaloValidationOptions", () => {
  it("defaults are sensible", () => {
    expect(DEFAULT_HALO_OPTIONS.maxAttempts).toBe(3);
    expect(DEFAULT_HALO_OPTIONS.temperaturePenalty).toBe(0.1);
    expect(DEFAULT_HALO_OPTIONS.requireSymbolicAnchors).toBe(true);
    expect(DEFAULT_HALO_OPTIONS.toneTolerance).toBe(0.5);
    expect(DEFAULT_HALO_OPTIONS.skipSafetyCheck).toBe(false);
  });

  it("MAX_HALO_ATTEMPTS is 3", () => {
    expect(MAX_HALO_ATTEMPTS).toBe(3);
  });
});

describe("ToneDeviationCheck", () => {
  it("can be constructed with all fields", () => {
    const check: ToneDeviationCheck = {
      expectedTone: "formal",
      detectedTone: "casual",
      deviationScore: 0.7,
    };
    expect(check.expectedTone).toBe("formal");
    expect(check.deviationScore).toBe(0.7);
  });
});

describe("SymbolicDriftCheck", () => {
  it("can be constructed with all fields", () => {
    const check: SymbolicDriftCheck = {
      expectedAnchors: ["golden_ratio", "sacred_geometry"],
      detectedAnchors: ["golden_ratio"],
      missingAnchors: ["sacred_geometry"],
      driftScore: 0.5,
    };
    expect(check.expectedAnchors).toContain("golden_ratio");
    expect(check.missingAnchors).toContain("sacred_geometry");
  });
});
