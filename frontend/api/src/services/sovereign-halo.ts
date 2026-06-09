import { SigilIdentity } from '../types/identity';
import { MythicIdentitySchema } from '../types/mythic';
import {
  ValidationReport,
  ValidationCheck,
  FailureReport,
  HaloValidationOptions,
  getDefaultHaloOptions,
  computeConfidenceScore
} from '../types/halo';
import { IdentityConstraintEngine } from './identity-constraints';
import { MythicModuleService } from './mythic-module';

export const MAX_HALO_ATTEMPTS = 3;

/**
 * SovereignHaloService
 * 
 * The core validation engine that enforces identity consistency before any output is delivered.
 * It validates LLM outputs against identity law (forbidden behaviors, tone deviation, symbolic drift)
 * and produces structured validation reports with confidence scores.
 */
export class SovereignHaloService {
  private options: HaloValidationOptions;

  constructor(
    private constraintEngine: IdentityConstraintEngine,
    private mythicModule: MythicModuleService,
    options?: Partial<HaloValidationOptions>
  ) {
    this.options = { ...getDefaultHaloOptions(), ...options };
  }

  /**
   * Validates an output string against the provided identity.
   * 
   * @param output The text output to validate
   * @param identity The identity to validate against
   * @param attemptNumber Optional attempt number for tracking regenerations
   * @returns A comprehensive ValidationReport
   */
  async validate(output: string, identity: SigilIdentity, attemptNumber?: number): Promise<ValidationReport> {
    const schema = this.mythicModule.generateSchema(identity);

    // Run all three check categories in parallel
    const [forbiddenChecks, toneChecks, symbolicChecks] = await Promise.all([
      Promise.resolve(this.checkForbiddenBehaviors(output, identity)),
      Promise.resolve(this.checkToneDeviation(output, schema)),
      Promise.resolve(this.checkSymbolicDrift(output, schema))
    ]);

    const checks = [...forbiddenChecks, ...toneChecks, ...symbolicChecks];
    const passedCount = checks.filter(c => c.passed).length;
    const failedCount = checks.filter(c => !c.passed).length;
    const totalCount = checks.length;
    const confidenceScore = computeConfidenceScore(checks);

    return {
      status: failedCount === 0 ? 'passed' : 'failed',
      checks,
      passedCount,
      failedCount,
      totalCount,
      confidenceScore,
      identityId: identity.id,
      validatedAt: new Date().toISOString(),
      attemptNumber
    };
  }

  /**
   * Checks for forbidden behaviors using the IdentityConstraintEngine.
   * Also performs a basic safety check if not skipped.
   * 
   * @param output The text output to check
   * @param identity The identity containing the rules
   * @returns Array of ValidationChecks
   */
  checkForbiddenBehaviors(output: string, identity: SigilIdentity): ValidationCheck[] {
    const result = this.constraintEngine.evaluate(output, identity);
    const checks: ValidationCheck[] = result.ruleChecks.map((ruleCheck, index) => ({
      rule: { id: `forbidden_${index}`, name: ruleCheck.rule, category: 'forbidden', weight: 1.0 },
      passed: ruleCheck.passed,
      detail: ruleCheck.detail || (ruleCheck.passed ? 'Rule passed' : 'Rule violated'),
      confidence: ruleCheck.passed ? 1.0 : 0.0
    }));

    if (!this.options.skipSafetyCheck) {
      const profanity = ['damn', 'hell', 'crap'];
      const lowerOutput = output.toLowerCase();
      const hasProfanity = profanity.some(word => lowerOutput.includes(word));
      
      checks.push({
        rule: { id: 'safety_profanity', name: 'No Profanity', category: 'safety', weight: 0.8 },
        passed: !hasProfanity,
        detail: hasProfanity ? 'Profanity detected in output' : 'No profanity detected',
        confidence: !hasProfanity ? 1.0 : 0.5
      });
    }

    return checks;
  }

  /**
   * Detects tone deviation by comparing output against the mythic tone schema.
   * 
   * @param output The text output to check
   * @param schema The mythic schema containing expected tone
   * @returns Array of ValidationChecks
   */
  checkToneDeviation(output: string, schema: MythicIdentitySchema): ValidationCheck[] {
    const expectedTone = schema.tone.length > 0 ? schema.tone[0].toLowerCase() : 'neutral';
    const lowerOutput = output.toLowerCase();

    const formalWords = ['shall', 'hereby', 'furthermore', 'pursuant', 'notwithstanding'];
    const informalWords = ['gonna', 'wanna', 'yeah', 'cool', 'awesome'];

    let formalCount = 0;
    let informalCount = 0;

    formalWords.forEach(w => { if (lowerOutput.includes(w)) formalCount++; });
    informalWords.forEach(w => { if (lowerOutput.includes(w)) informalCount++; });

    let detectedTone = 'neutral';
    if ((expectedTone.includes('formal') || expectedTone.includes('ceremonial')) && formalCount > informalCount) {
      detectedTone = expectedTone;
    } else if ((expectedTone.includes('playful') || expectedTone.includes('casual')) && informalCount > formalCount) {
      detectedTone = expectedTone;
    } else if (formalCount > informalCount) {
      detectedTone = 'formal';
    } else if (informalCount > formalCount) {
      detectedTone = 'playful';
    }

    let deviationScore = 0.0;
    if (expectedTone !== detectedTone) {
      if (expectedTone === 'neutral' || detectedTone === 'neutral') {
        deviationScore = 0.5;
      } else {
        deviationScore = 1.0;
      }
    }

    const passed = deviationScore <= (this.options.toneTolerance ?? 0.5);

    return [{
      rule: { id: 'tone_deviation', name: 'Tone Deviation', category: 'tone', weight: 0.9 },
      passed,
      detail: `Expected tone: ${expectedTone}, detected: ${detectedTone}, deviation: ${deviationScore}`,
      confidence: 1.0 - deviationScore,
      metadata: { expectedTone, detectedTone, deviationScore }
    }];
  }

  /**
   * Detects symbolic drift by checking for symbolic anchor references in the output.
   * 
   * @param output The text output to check
   * @param schema The mythic schema containing expected anchors
   * @returns Array of ValidationChecks
   */
  checkSymbolicDrift(output: string, schema: MythicIdentitySchema): ValidationCheck[] {
    const expectedAnchors = schema.anchors.map(a => a.name);
    
    if (!this.options.requireSymbolicAnchors || expectedAnchors.length === 0) {
      return [{
        rule: { id: 'symbolic_drift', name: 'Symbolic Drift', category: 'symbolic', weight: 0.7 },
        passed: true,
        detail: 'Symbolic anchors not required or none defined',
        confidence: 1.0,
        metadata: { expectedAnchors, detectedAnchors: [], missingAnchors: [], driftScore: 0.0 }
      }];
    }

    const lowerOutput = output.toLowerCase();
    const detectedAnchors: string[] = [];
    const missingAnchors: string[] = [];

    expectedAnchors.forEach(anchor => {
      if (lowerOutput.includes(anchor.toLowerCase())) {
        detectedAnchors.push(anchor);
      } else {
        missingAnchors.push(anchor);
      }
    });

    const driftScore = missingAnchors.length / expectedAnchors.length;
    const passed = driftScore === 0;

    return [{
      rule: { id: 'symbolic_drift', name: 'Symbolic Drift', category: 'symbolic', weight: 0.7 },
      passed,
      detail: `Expected anchors: [${expectedAnchors.join(', ')}], found: [${detectedAnchors.join(', ')}]`,
      confidence: 1.0 - driftScore,
      metadata: { expectedAnchors, detectedAnchors, missingAnchors, driftScore }
    }];
  }

  /**
   * Generates a FailureReport when validation cannot be satisfied after max attempts.
   * 
   * @param validationReport The final failed validation report
   * @param attemptCount The total number of attempts made
   * @param identity The identity being validated against
   * @returns A structured FailureReport
   */
  generateFailureReport(validationReport: ValidationReport, attemptCount: number, identity: SigilIdentity): FailureReport {
    const violationSummary = validationReport.checks
      .filter(c => !c.passed)
      .map(c => c.detail);

    const fallbackRule = identity.rules.find(r => r.toLowerCase().startsWith('fallback:'));
    const safeFallbackMessage = fallbackRule 
      ? fallbackRule.split(':').slice(1).join(':').trim() 
      : "The generation could not satisfy identity constraints. Please refine your request.";

    return {
      status: 'failed',
      attemptCount,
      violationSummary,
      safeFallbackMessage,
      lastValidationReport: validationReport,
      identityId: identity.id,
      generatedAt: new Date().toISOString()
    };
  }
}
