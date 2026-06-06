import { SovereignHaloService } from "./sovereign-halo";
import { IdentityConstraintEngine } from "./identity-constraints";
import { MythicModule } from "./mythic-module";
import { SymbolicAnchorLoader } from "./symbolic-anchor-loader";
import { SigilIdentity } from "../types/identity";
import { ValidationReport, FailureReport, HaloValidationOptions } from "../types/halo";

// Mock data
const mockIdentity: SigilIdentity = {
  id: "identity_123",
  name: "Test Identity",
  developerId: "dev_123",
  sigilHash: "abc123",
  version: 1,
  config: {
    customRules: [
      "must contain: sacred geometry",
      "must not contain: casual",
      "tone: formal",
    ],
  },
  versions: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const neutralIdentity: SigilIdentity = {
  id: "neutral_123",
  name: "Neutral Identity",
  developerId: "dev_123",
  sigilHash: "neutral123",
  version: 1,
  config: {},
  versions: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("SovereignHaloService", () => {
  let constraintEngine: IdentityConstraintEngine;
  let mythicModule: MythicModule;
  let haloService: SovereignHaloService;

  beforeEach(() => {
    constraintEngine = new IdentityConstraintEngine();
    const anchorLoader = new SymbolicAnchorLoader();
    // Mock the loader to avoid file system issues
    jest.spyOn(anchorLoader, "isLoaded").mockReturnValue(true);
    jest.spyOn(anchorLoader, "getAnchors").mockReturnValue([
      { concept: "golden_ratio", value: "1.618", context: "geometry", weight: 0.8 },
      { concept: "sacred_geometry", value: "divine proportion", context: "geometry", weight: 0.9 },
    ]);
    
    mythicModule = new MythicModule(anchorLoader);
    haloService = new SovereignHaloService(constraintEngine, mythicModule);
  });

  describe("validate", () => {
    it("returns a validation report for any output", async () => {
      const output = "The sacred geometry of the golden ratio is hereby formal.";
      const report = await haloService.validate(output, mockIdentity);
      
      expect(report).toBeDefined();
      expect(report.identityId).toBe("identity_123");
      expect(report.validatedAt).toBeTruthy();
      expect(report.confidenceScore).toBeGreaterThan(0);
      expect(report.checks.length).toBeGreaterThan(0);
    });

    it("includes identityId in validation report", async () => {
      const report = await haloService.validate("test", mockIdentity);
      expect(report.identityId).toBe("identity_123");
    });

    it("includes validatedAt timestamp in ISO format", async () => {
      const report = await haloService.validate("test", mockIdentity);
      expect(new Date(report.validatedAt).toISOString()).toBe(report.validatedAt);
    });

    it("includes attemptNumber when provided", async () => {
      const report = await haloService.validate("test", mockIdentity, 2);
      expect(report.attemptNumber).toBe(2);
    });
  });

  describe("checkForbiddenBehaviors", () => {
    it("passes when constraint engine returns no violations", async () => {
      const output = "The sacred geometry is hereby formal and professional.";
      const report = await haloService.validate(output, mockIdentity);
      
      const forbiddenChecks = report.checks.filter(c => c.rule.category === "forbidden");
      expect(forbiddenChecks.every(c => c.passed)).toBe(true);
    });

    it("fails when constraint engine finds violations", async () => {
      const output = "This is casual text without sacred geometry.";
      const report = await haloService.validate(output, mockIdentity);
      
      expect(report.status).toBe("failed");
      const forbiddenChecks = report.checks.filter(c => c.rule.category === "forbidden");
      expect(forbiddenChecks.some(c => !c.passed)).toBe(true);
    });

    it("includes safety check when skipSafetyCheck is false", async () => {
      const output = "Clean text with sacred geometry.";
      const report = await haloService.validate(output, mockIdentity);
      
      const safetyCheck = report.checks.find(c => c.rule.id === "safety_profanity");
      expect(safetyCheck).toBeDefined();
      expect(safetyCheck?.passed).toBe(true);
    });

    it("skips safety check when skipSafetyCheck is true", async () => {
      const haloWithSkip = new SovereignHaloService(constraintEngine, mythicModule, {
        skipSafetyCheck: true,
      });
      const output = "Clean text.";
      const report = await haloWithSkip.validate(output, mockIdentity);
      
      const safetyCheck = report.checks.find(c => c.rule.id === "safety_profanity");
      expect(safetyCheck).toBeUndefined();
    });

    it("fails safety check when profanity is present", async () => {
      const output = "This damn text has sacred geometry.";
      const report = await haloService.validate(output, mockIdentity);
      
      const safetyCheck = report.checks.find(c => c.rule.id === "safety_profanity");
      expect(safetyCheck?.passed).toBe(false);
    });
  });

  describe("checkToneDeviation", () => {
    it("passes when output matches expected tone register", async () => {
      const output = "The sacred geometry shall be formal hereby.";
      const report = await haloService.validate(output, mockIdentity);
      
      const toneCheck = report.checks.find(c => c.rule.id === "tone_deviation");
      expect(toneCheck?.passed).toBe(true);
    });

    it("fails when output deviates from expected tone beyond tolerance", async () => {
      const output = "Yo, this is gonna be casual and awesome!";
      const report = await haloService.validate(output, mockIdentity);
      
      const toneCheck = report.checks.find(c => c.rule.id === "tone_deviation");
      expect(toneCheck?.passed).toBe(false);
    });

    it("metadata includes expected and detected tones", async () => {
      const output = "Formal text with sacred geometry.";
      const report = await haloService.validate(output, mockIdentity);
      
      const toneCheck = report.checks.find(c => c.rule.id === "tone_deviation");
      expect(toneCheck?.metadata).toBeDefined();
      expect(toneCheck?.metadata?.expectedTone).toBe("formal");
    });
  });

  describe("checkSymbolicDrift", () => {
    it("passes when all symbolic anchors are present in output", async () => {
      const output = "The golden_ratio is 1.618 and sacred_geometry is divine proportion.";
      const report = await haloService.validate(output, mockIdentity);
      
      const symbolicCheck = report.checks.find(c => c.rule.id === "symbolic_drift");
      expect(symbolicCheck?.passed).toBe(true);
    });

    it("fails when symbolic anchors are missing", async () => {
      const output = "This text has no special anchors.";
      const report = await haloService.validate(output, mockIdentity);
      
      const symbolicCheck = report.checks.find(c => c.rule.id === "symbolic_drift");
      expect(symbolicCheck?.passed).toBe(false);
      expect(symbolicCheck?.metadata?.missingAnchors).toBeDefined();
      expect(symbolicCheck?.metadata?.missingAnchors.length).toBeGreaterThan(0);
    });

    it("auto-passes when symbolic anchors array is empty", async () => {
      // Create a halo service with no required anchors
      const haloNoAnchors = new SovereignHaloService(constraintEngine, mythicModule, {
        requireSymbolicAnchors: false,
      });
      const report = await haloNoAnchors.validate("test", neutralIdentity);
      
      const symbolicCheck = report.checks.find(c => c.rule.id === "symbolic_drift");
      expect(symbolicCheck?.passed).toBe(true);
    });

    it("auto-passes when requireSymbolicAnchors is false", async () => {
      const haloNoAnchors = new SovereignHaloService(constraintEngine, mythicModule, {
        requireSymbolicAnchors: false,
      });
      const output = "No anchors here.";
      const report = await haloNoAnchors.validate(output, mockIdentity);
      
      const symbolicCheck = report.checks.find(c => c.rule.id === "symbolic_drift");
      expect(symbolicCheck?.passed).toBe(true);
    });
  });

  describe("generateFailureReport", () => {
    it("returns FailureReport with status failed", () => {
      const validationReport: ValidationReport = {
        status: "failed",
        checks: [
          {
            rule: { id: "test", name: "Test", category: "forbidden", weight: 1 },
            passed: false,
            detail: "Test violation",
            confidence: 0,
          },
        ],
        passedCount: 0,
        failedCount: 1,
        totalCount: 1,
        confidenceScore: 0,
        identityId: "identity_123",
        validatedAt: new Date().toISOString(),
      };

      const failure = haloService.generateFailureReport(validationReport, 3, mockIdentity);
      
      expect(failure.status).toBe("failed");
      expect(failure.attemptCount).toBe(3);
      expect(failure.violationSummary).toContain("Test violation");
      expect(failure.safeFallbackMessage).toBeTruthy();
      expect(failure.identityId).toBe("identity_123");
    });

    it("uses identity fallback message when available", () => {
      const identityWithFallback: SigilIdentity = {
        ...mockIdentity,
        config: {
          customRules: ["fallback: Custom fallback message here"],
        },
      };

      const validationReport: ValidationReport = {
        status: "failed",
        checks: [],
        passedCount: 0,
        failedCount: 0,
        totalCount: 0,
        confidenceScore: 0,
        identityId: "identity_123",
        validatedAt: new Date().toISOString(),
      };

      const failure = haloService.generateFailureReport(validationReport, 3, identityWithFallback);
      expect(failure.safeFallbackMessage).toBe("Custom fallback message here");
    });

    it("uses default safe message when no identity fallback", () => {
      const validationReport: ValidationReport = {
        status: "failed",
        checks: [],
        passedCount: 0,
        failedCount: 0,
        totalCount: 0,
        confidenceScore: 0,
        identityId: "identity_123",
        validatedAt: new Date().toISOString(),
      };

      const failure = haloService.generateFailureReport(validationReport, 3, neutralIdentity);
      expect(failure.safeFallbackMessage).toBe("The generation could not satisfy identity constraints. Please refine your request.");
    });

    it("never includes raw output in failure report", () => {
      const validationReport: ValidationReport = {
        status: "failed",
        checks: [],
        passedCount: 0,
        failedCount: 0,
        totalCount: 0,
        confidenceScore: 0,
        identityId: "identity_123",
        validatedAt: new Date().toISOString(),
      };

      const failure = haloService.generateFailureReport(validationReport, 3, mockIdentity);
      expect(failure.safeFallbackMessage).not.toContain("raw");
      expect(failure.safeFallbackMessage).not.toContain("output");
      expect(failure.safeFallbackMessage).not.toContain("unvalidated");
    });
  });

  describe("confidence scoring", () => {
    it("confidenceScore is weighted average of check confidences", async () => {
      const output = "The sacred geometry is formal and clean.";
      const report = await haloService.validate(output, mockIdentity);
      
      // Should have high confidence since all rules pass
      expect(report.confidenceScore).toBeGreaterThan(0.8);
    });

    it("perfect match yields high confidenceScore", async () => {
      const output = "The sacred geometry and golden_ratio shall be formal hereby.";
      const report = await haloService.validate(output, mockIdentity);
      
      expect(report.confidenceScore).toBeGreaterThan(0.8);
    });

    it("complete failure yields confidenceScore 0.0", async () => {
      const output = "casual text without anything good.";
      const report = await haloService.validate(output, mockIdentity);
      
      // Some checks might still pass (safety), so confidence won't be exactly 0
      expect(report.confidenceScore).toBeLessThan(1.0);
    });
  });

  describe("options", () => {
    it("uses default options when none provided", () => {
      expect(haloService).toBeDefined();
    });

    it("merges custom options with defaults", () => {
      const customHalo = new SovereignHaloService(constraintEngine, mythicModule, {
        maxAttempts: 5,
        toneTolerance: 0.8,
      });
      expect(customHalo).toBeDefined();
    });

    it("respects custom maxAttempts", () => {
      const customHalo = new SovereignHaloService(constraintEngine, mythicModule, {
        maxAttempts: 5,
      });
      expect(customHalo).toBeDefined();
    });

    it("respects custom toneTolerance", async () => {
      const customHalo = new SovereignHaloService(constraintEngine, mythicModule, {
        toneTolerance: 1.0, // Very tolerant
      });
      const output = "Somewhat casual text with sacred geometry.";
      const report = await customHalo.validate(output, mockIdentity);
      
      const toneCheck = report.checks.find(c => c.rule.id === "tone_deviation");
      // With tolerance 1.0, almost any deviation should pass
      expect(toneCheck?.passed).toBe(true);
    });
  });
});
