import { SigilIdentity } from "../types/identity";
import {
  ValidationRule,
  ValidationCheck,
  ValidationReport,
  FailureReport,
  HaloValidationOptions,
  DEFAULT_HALO_OPTIONS,
  MAX_HALO_ATTEMPTS,
  computeConfidenceScore,
} from "../types/halo";
import { MythicIdentitySchema } from "../types/mythic";
import { IdentityConstraintEngine, IdentityConstraintResult } from "./identity-constraints";
import { MythicModule } from "./mythic-module";

/**
 * SovereignHaloService validates LLM outputs against identity law.
 * 
 * Checks:
 * - Forbidden behaviors (via IdentityConstraintEngine)
 * - Tone deviation (comparing output against mythic tone schema)
 * - Symbolic drift (checking for symbolic anchor references)
 * - Safety (profanity check)
 * 
 * Produces structured ValidationReport with per-check confidence scores.
 * After max attempts, generates FailureReport with safe fallback message.
 */
export class SovereignHaloService {
  private constraintEngine: IdentityConstraintEngine;
  private mythicModule: MythicModule;
  private options: HaloValidationOptions;

  // Built-in profanity list for safety check
  private static PROFANITY_LIST = ["damn", "hell", "crap", "stupid", "idiot"];

  // Formal vocabulary for tone detection
  private static FORMAL_WORDS = ["shall", "hereby", "furthermore", "pursuant", "notwithstanding", "heretofore"];
  
  // Informal vocabulary for tone detection
  private static INFORMAL_WORDS = ["gonna", "wanna", "yeah", "cool", "awesome", "lol", "omg"];

  constructor(
    constraintEngine: IdentityConstraintEngine,
    mythicModule: MythicModule,
    options?: HaloValidationOptions
  ) {
    this.constraintEngine = constraintEngine;
    this.mythicModule = mythicModule;
    this.options = { ...DEFAULT_HALO_OPTIONS, ...options };
  }

  getMaxAttempts(): number {
    return this.options.maxAttempts ?? MAX_HALO_ATTEMPTS;
  }

  /**
   * Validate an output against identity rules.
   * 
   * @param output The LLM output to validate
   * @param identity The identity to validate against
   * @param attemptNumber Which regeneration attempt this is (1-based)
   * @returns ValidationReport with all checks and aggregate score
   */
  async validate(output: string, identity: SigilIdentity, attemptNumber?: number): Promise<ValidationReport> {
    const schema = await this.mythicModule.generateSchema(identity);
    
    // Run all checks in parallel
    const [forbiddenChecks, toneChecks, symbolicChecks] = await Promise.all([
      this.checkForbiddenBehaviors(output, identity),
      this.checkToneDeviation(output, schema),
      this.checkSymbolicDrift(output, schema),
    ]);

    const allChecks = [...forbiddenChecks, ...toneChecks, ...symbolicChecks];
    const passedCount = allChecks.filter(c => c.passed).length;
    const failedCount = allChecks.filter(c => !c.passed).length;
    const totalCount = allChecks.length;

    const confidenceScore = computeConfidenceScore(allChecks);

    return {
      status: failedCount === 0 ? "passed" : "failed",
      checks: allChecks,
      passedCount,
      failedCount,
      totalCount,
      confidenceScore,
      identityId: identity.id,
      validatedAt: new Date().toISOString(),
      attemptNumber,
    };
  }

  /**
   * Check output against forbidden behaviors using IdentityConstraintEngine.
   */
  private checkForbiddenBehaviors(output: string, identity: SigilIdentity): ValidationCheck[] {
    const checks: ValidationCheck[] = [];
    
    // Delegate to constraint engine
    const result: IdentityConstraintResult = this.constraintEngine.evaluate(output, identity);
    
    result.ruleChecks.forEach((ruleCheck, index) => {
      checks.push({
        rule: {
          id: `forbidden_${index}`,
          name: ruleCheck.rule,
          category: "forbidden",
          weight: 1.0,
        },
        passed: ruleCheck.passed,
        detail: ruleCheck.detail,
        confidence: ruleCheck.passed ? 1.0 : 0.0,
      });
    });

    // Safety check (unless skipped)
    if (!this.options.skipSafetyCheck) {
      const outputLower = output.toLowerCase();
      const hasProfanity = SovereignHaloService.PROFANITY_LIST.some(word => 
        outputLower.includes(word.toLowerCase())
      );
      
      checks.push({
        rule: {
          id: "safety_profanity",
          name: "No Profanity",
          category: "safety",
          weight: 0.8,
        },
        passed: !hasProfanity,
        detail: hasProfanity ? "Output contains profanity" : "Output is clean",
        confidence: hasProfanity ? 0.5 : 1.0,
      });
    }

    return checks;
  }

  /**
   * Check tone deviation by comparing output against expected tone.
   */
  private checkToneDeviation(output: string, schema: MythicIdentitySchema): ValidationCheck[] {
    const expectedTone = schema.tone.register.toLowerCase();
    const outputLower = output.toLowerCase();

    // Count formal and informal words
    const formalCount = SovereignHaloService.FORMAL_WORDS.filter(word => 
      outputLower.includes(word.toLowerCase())
    ).length;
    
    const informalCount = SovereignHaloService.INFORMAL_WORDS.filter(word => 
      outputLower.includes(word.toLowerCase())
    ).length;

    // Determine detected tone
    let detectedTone = "neutral";
    if (expectedTone === "formal" || expectedTone === "authoritative") {
      if (formalCount > informalCount) {
        detectedTone = "formal";
      } else if (informalCount > formalCount) {
        detectedTone = "informal";
      }
    } else if (expectedTone === "playful" || expectedTone === "casual") {
      if (informalCount > formalCount) {
        detectedTone = "playful";
      } else if (formalCount > informalCount) {
        detectedTone = "formal";
      }
    } else if (expectedTone === "neutral") {
      detectedTone = "neutral";
    } else {
      // Unknown tone register — flag for review rather than silently passing
      detectedTone = "unrecognized";
    }

    // Compute deviation score
    let deviationScore = 0;
    if (detectedTone === expectedTone) {
      deviationScore = 0;
    } else if (detectedTone === "neutral") {
      deviationScore = 0.3;
    } else {
      deviationScore = 1.0;
    }

    const passed = deviationScore <= (this.options.toneTolerance || 0.5);

    return [{
      rule: {
        id: "tone_deviation",
        name: "Tone Deviation",
        category: "tone",
        weight: 0.9,
      },
      passed,
      detail: `Expected tone: ${expectedTone}, detected: ${detectedTone}, deviation: ${deviationScore}`,
      confidence: 1.0 - deviationScore,
      metadata: {
        expectedTone,
        detectedTone,
        deviationScore,
        formalCount,
        informalCount,
      },
    }];
  }

  /**
   * Check symbolic drift by looking for expected anchors in output.
   */
  private checkSymbolicDrift(output: string, schema: MythicIdentitySchema): ValidationCheck[] {
    const expectedAnchors = schema.symbolicAnchors.map(a => a.concept);
    
    // If no anchors or not required, auto-pass
    if (!this.options.requireSymbolicAnchors || expectedAnchors.length === 0) {
      return [{
        rule: {
          id: "symbolic_drift",
          name: "Symbolic Drift",
          category: "symbolic",
          weight: 0.7,
        },
        passed: true,
        detail: "No symbolic anchors required or anchors list is empty",
        confidence: 1.0,
        metadata: {
          expectedAnchors,
          detectedAnchors: [],
          missingAnchors: [],
          driftScore: 0,
        },
      }];
    }

    const outputLower = output.toLowerCase();
    const detectedAnchors: string[] = [];
    const missingAnchors: string[] = [];

    for (const anchor of expectedAnchors) {
      // Check if anchor concept or value appears in output
      const anchorLower = anchor.toLowerCase();
      const anchorObj = schema.symbolicAnchors.find(a => a.concept === anchor);
      const anchorValue = anchorObj?.value?.toLowerCase();
      
      if (outputLower.includes(anchorLower) || (anchorValue && anchorValue.length > 0 && outputLower.includes(anchorValue))) {
        detectedAnchors.push(anchor);
      } else {
        missingAnchors.push(anchor);
      }
    }

    const driftScore = expectedAnchors.length > 0 ? missingAnchors.length / expectedAnchors.length : 0;
    const passed = driftScore === 0;

    return [{
      rule: {
        id: "symbolic_drift",
        name: "Symbolic Drift",
        category: "symbolic",
        weight: 0.7,
      },
      passed,
      detail: `Expected anchors: [${expectedAnchors.join(", ")}], found: [${detectedAnchors.join(", ")}]`,
      confidence: 1.0 - driftScore,
      metadata: {
        expectedAnchors,
        detectedAnchors,
        missingAnchors,
        driftScore,
      },
    }];
  }

  /**
   * Generate a failure report when max attempts are exhausted.
   */
  generateFailureReport(
    validationReport: ValidationReport,
    attemptCount: number,
    identity: SigilIdentity
  ): FailureReport {
    const violationSummary = validationReport.checks
      .filter(c => !c.passed)
      .map(c => c.detail);

    // Try to get fallback message from identity config
    const DEFAULT_FALLBACK = "The generation could not satisfy identity constraints. Please refine your request.";
    const fallbackRule = identity.config?.customRules?.find(
      r => r.toLowerCase().startsWith("fallback:")
    );
    
    const safeFallbackMessage = fallbackRule
      ? (fallbackRule.split(":")[1]?.trim() || DEFAULT_FALLBACK)
      : DEFAULT_FALLBACK;

    return {
      status: "failed",
      attemptCount,
      violationSummary,
      safeFallbackMessage,
      lastValidationReport: validationReport,
      identityId: identity.id,
      generatedAt: new Date().toISOString(),
    };
  }
}

export { MAX_HALO_ATTEMPTS };
