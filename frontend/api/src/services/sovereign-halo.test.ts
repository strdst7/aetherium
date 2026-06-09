import { SovereignHaloService, MAX_HALO_ATTEMPTS } from './sovereign-halo';
import { IdentityConstraintEngine } from './identity-constraints';
import { MythicModuleService } from './mythic-module';
import { SymbolicAnchorLoader } from './symbolic-anchor-loader';
import { SigilIdentity } from '../types/identity';
import { MythicIdentitySchema } from '../types/mythic';

jest.mock('./identity-constraints');
jest.mock('./mythic-module');

describe('SovereignHaloService', () => {
  let constraintEngine: jest.Mocked<IdentityConstraintEngine>;
  let mythicModule: jest.Mocked<MythicModuleService>;
  let haloService: SovereignHaloService;

  const mockIdentity: SigilIdentity = {
    id: 'test-id',
    name: 'Test Identity',
    description: 'Test',
    rules: ['must not contain: forbidden_word', 'fallback: Custom safe message']
  };

  const mockSchema: MythicIdentitySchema = {
    tone: ['formal'],
    voice: 'objective',
    anchors: [{ name: 'GoldenRatio', weight: 1.0, description: 'test' }],
    sigilHash: 'hash',
    isNeutral: false
  };

  beforeEach(() => {
    constraintEngine = new IdentityConstraintEngine() as jest.Mocked<IdentityConstraintEngine>;
    mythicModule = new MythicModuleService({} as SymbolicAnchorLoader) as jest.Mocked<MythicModuleService>;
    
    constraintEngine.evaluate.mockReturnValue({
      passed: true,
      violations: [],
      ruleChecks: [{ rule: 'rule1', passed: true, detail: 'ok' }]
    });
    
    mythicModule.generateSchema.mockReturnValue(mockSchema);
    
    haloService = new SovereignHaloService(constraintEngine, mythicModule);
  });

  describe('validate', () => {
    it('returns passed report for output matching all rules', async () => {
      const output = 'This shall hereby include the goldenratio.';
      const report = await haloService.validate(output, mockIdentity);
      
      expect(report.status).toBe('passed');
      expect(report.failedCount).toBe(0);
      expect(report.confidenceScore).toBeGreaterThan(0.9);
    });

    it('includes identityId in validation report', async () => {
      const report = await haloService.validate('test', mockIdentity);
      expect(report.identityId).toBe('test-id');
    });

    it('includes validatedAt timestamp in ISO format', async () => {
      const report = await haloService.validate('test', mockIdentity);
      expect(report.validatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('includes attemptNumber when provided', async () => {
      const report = await haloService.validate('test', mockIdentity, 2);
      expect(report.attemptNumber).toBe(2);
    });
  });

  describe('checkForbiddenBehaviors', () => {
    it('passes when constraint engine returns no violations', () => {
      const checks = haloService.checkForbiddenBehaviors('test', mockIdentity);
      expect(checks[0].passed).toBe(true);
    });

    it('fails when constraint engine finds violations', () => {
      constraintEngine.evaluate.mockReturnValue({
        passed: false,
        violations: [{ rule: 'r1', message: 'fail' }],
        ruleChecks: [{ rule: 'r1', passed: false, detail: 'fail' }]
      });
      const checks = haloService.checkForbiddenBehaviors('test', mockIdentity);
      expect(checks[0].passed).toBe(false);
    });

    it('includes safety check when skipSafetyCheck is false', () => {
      const checks = haloService.checkForbiddenBehaviors('test', mockIdentity);
      const safetyCheck = checks.find(c => c.rule.category === 'safety');
      expect(safetyCheck).toBeDefined();
      expect(safetyCheck?.passed).toBe(true);
    });

    it('skips safety check when skipSafetyCheck is true', () => {
      const customService = new SovereignHaloService(constraintEngine, mythicModule, { skipSafetyCheck: true });
      const checks = customService.checkForbiddenBehaviors('test', mockIdentity);
      const safetyCheck = checks.find(c => c.rule.category === 'safety');
      expect(safetyCheck).toBeUndefined();
    });

    it('fails safety check when profanity is present', () => {
      const checks = haloService.checkForbiddenBehaviors('This is crap', mockIdentity);
      const safetyCheck = checks.find(c => c.rule.category === 'safety');
      expect(safetyCheck?.passed).toBe(false);
      expect(safetyCheck?.confidence).toBe(0.5);
    });
  });

  describe('checkToneDeviation', () => {
    it('passes when output matches expected tone register', () => {
      const checks = haloService.checkToneDeviation('We shall hereby proceed.', mockSchema);
      expect(checks[0].passed).toBe(true);
      expect(checks[0].metadata?.detectedTone).toBe('formal');
    });

    it('fails when output deviates from expected tone beyond tolerance', () => {
      const checks = haloService.checkToneDeviation('Yeah gonna do that.', mockSchema);
      expect(checks[0].passed).toBe(false);
      expect(checks[0].metadata?.detectedTone).toBe('playful');
    });

    it('detects formal tone from formal vocabulary', () => {
      const checks = haloService.checkToneDeviation('furthermore, pursuant to the rules', mockSchema);
      expect(checks[0].metadata?.detectedTone).toBe('formal');
    });

    it('detects playful tone from informal vocabulary', () => {
      const playfulSchema = { ...mockSchema, tone: ['playful'] };
      const checks = haloService.checkToneDeviation('awesome, gonna be cool', playfulSchema);
      expect(checks[0].metadata?.detectedTone).toBe('playful');
    });

    it('metadata includes expected and detected tones', () => {
      const checks = haloService.checkToneDeviation('test', mockSchema);
      expect(checks[0].metadata?.expectedTone).toBe('formal');
      expect(checks[0].metadata?.detectedTone).toBeDefined();
    });
  });

  describe('checkSymbolicDrift', () => {
    it('passes when all symbolic anchors are present in output', () => {
      const checks = haloService.checkSymbolicDrift('The goldenratio is key.', mockSchema);
      expect(checks[0].passed).toBe(true);
    });

    it('fails when symbolic anchors are missing', () => {
      const checks = haloService.checkSymbolicDrift('No anchors here.', mockSchema);
      expect(checks[0].passed).toBe(false);
      expect(checks[0].metadata?.missingAnchors).toContain('GoldenRatio');
    });

    it('auto-passes when symbolic anchors array is empty', () => {
      const emptySchema = { ...mockSchema, anchors: [] };
      const checks = haloService.checkSymbolicDrift('test', emptySchema);
      expect(checks[0].passed).toBe(true);
    });

    it('auto-passes when requireSymbolicAnchors is false', () => {
      const customService = new SovereignHaloService(constraintEngine, mythicModule, { requireSymbolicAnchors: false });
      const checks = customService.checkSymbolicDrift('test', mockSchema);
      expect(checks[0].passed).toBe(true);
    });

    it('metadata includes missingAnchors list', () => {
      const checks = haloService.checkSymbolicDrift('test', mockSchema);
      expect(checks[0].metadata?.missingAnchors).toEqual(['GoldenRatio']);
    });
  });

  describe('generateFailureReport', () => {
    const mockReport: any = {
      checks: [
        { passed: false, detail: 'Tone mismatch' },
        { passed: true, detail: 'ok' }
      ]
    };

    it('returns FailureReport with status failed', () => {
      const report = haloService.generateFailureReport(mockReport, 3, mockIdentity);
      expect(report.status).toBe('failed');
    });

    it('includes attemptCount', () => {
      const report = haloService.generateFailureReport(mockReport, 3, mockIdentity);
      expect(report.attemptCount).toBe(3);
    });

    it('includes violationSummary from failed checks', () => {
      const report = haloService.generateFailureReport(mockReport, 3, mockIdentity);
      expect(report.violationSummary).toEqual(['Tone mismatch']);
    });

    it('uses identity fallback message when available', () => {
      const report = haloService.generateFailureReport(mockReport, 3, mockIdentity);
      expect(report.safeFallbackMessage).toBe('Custom safe message');
    });

    it('uses default safe message when no identity fallback', () => {
      const emptyIdentity = { ...mockIdentity, rules: [] };
      const report = haloService.generateFailureReport(mockReport, 3, emptyIdentity);
      expect(report.safeFallbackMessage).toContain('could not satisfy identity constraints');
    });

    it('never includes raw output in failure report', () => {
      const report = haloService.generateFailureReport(mockReport, 3, mockIdentity);
      expect(JSON.stringify(report)).not.toContain('raw output');
    });
  });

  describe('options and confidence', () => {
    it('confidenceScore is weighted average of check confidences', async () => {
      const report = await haloService.validate('This shall hereby include the goldenratio.', mockIdentity);
      expect(report.confidenceScore).toBeGreaterThan(0);
      expect(report.confidenceScore).toBeLessThanOrEqual(1);
    });

    it('perfect match yields confidenceScore 1.0', async () => {
      const report = await haloService.validate('This shall hereby include the goldenratio.', mockIdentity);
      expect(report.confidenceScore).toBe(1.0);
    });

    it('uses default options when none provided', () => {
      const service = new SovereignHaloService(constraintEngine, mythicModule);
      expect((service as any).options.maxAttempts).toBe(3);
    });

    it('merges custom options with defaults', () => {
      const service = new SovereignHaloService(constraintEngine, mythicModule, { maxAttempts: 5 });
      expect((service as any).options.maxAttempts).toBe(5);
      expect((service as any).options.temperaturePenalty).toBe(0.1);
    });
  });
});
