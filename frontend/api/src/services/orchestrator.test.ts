import { Orchestrator } from './orchestrator';
import { MemoryService } from './memory-service';
import { ProviderRegistry } from './provider-registry';
import { IdentityBindingService } from './identity-binding';
import { MythicModuleService } from './mythic-module';
import { SovereignHaloService } from './sovereign-halo';
import { SigilIdentity } from '../types/identity';
import { ValidationReport } from '../types/halo';

// Mock dependencies
jest.mock('./memory-service');
jest.mock('./provider-registry');
jest.mock('./identity-binding');
jest.mock('./mythic-module');
jest.mock('./sovereign-halo');

describe('Orchestrator with Sovereign Halo', () => {
  let memoryService: jest.Mocked<MemoryService>;
  let providerRegistry: jest.Mocked<ProviderRegistry>;
  let identityBinding: jest.Mocked<IdentityBindingService>;
  let mythicModule: jest.Mocked<MythicModuleService>;
  let sovereignHalo: jest.Mocked<SovereignHaloService>;
  let mockProvider: any;

  const mockIdentity: SigilIdentity = {
    id: 'test-id',
    name: 'Test',
    description: 'Test',
    rules: []
  };

  beforeEach(() => {
    memoryService = new MemoryService() as jest.Mocked<MemoryService>;
    providerRegistry = new ProviderRegistry() as jest.Mocked<ProviderRegistry>;
    identityBinding = new IdentityBindingService({} as any) as jest.Mocked<IdentityBindingService>;
    mythicModule = new MythicModuleService({} as any) as jest.Mocked<MythicModuleService>;
    sovereignHalo = new SovereignHaloService({} as any, {} as any) as jest.Mocked<SovereignHaloService>;

    mockProvider = {
      name: 'mock-provider',
      generate: jest.fn().mockResolvedValue({ text: 'Initial response' })
    };

    memoryService.embedQuery.mockResolvedValue([0.1, 0.2]);
    memoryService.vectorSearch.mockResolvedValue([]);
    providerRegistry.pick.mockResolvedValue(mockProvider);
    identityBinding.resolveOrThrow.mockResolvedValue(mockIdentity);
    mythicModule.generateMythicPrompt.mockReturnValue('');
    mythicModule.mythify.mockResolvedValue({ output: 'Mythified response', applied: true, metadata: { tone: 'neutral', anchors: 'none', latency: 10 } });
  });

  const createOrchestrator = (halo?: SovereignHaloService) => {
    return new Orchestrator(memoryService, providerRegistry, identityBinding, mythicModule, halo);
  };

  const createMockReport = (status: 'passed' | 'failed'): ValidationReport => ({
    status,
    checks: [{ rule: { id: 'r1', name: 'R1', category: 'safety', weight: 1 }, passed: status === 'passed', detail: 'detail', confidence: status === 'passed' ? 1 : 0 }],
    passedCount: status === 'passed' ? 1 : 0,
    failedCount: status === 'passed' ? 0 : 1,
    totalCount: 1,
    confidenceScore: status === 'passed' ? 1 : 0,
    identityId: 'test-id',
    validatedAt: new Date().toISOString()
  });

  describe('Validation Pass Path', () => {
    it('returns output with validationReport when validation passes on first attempt', async () => {
      sovereignHalo.validate.mockResolvedValue(createMockReport('passed'));
      const orchestrator = createOrchestrator(sovereignHalo);

      const result = await orchestrator.process({ query: 'test', identity_anchor: 'test-id' });

      expect(result.validationReport).toBeDefined();
      expect(result.validationReport?.status).toBe('passed');
      expect(result.validationReport?.confidenceScore).toBe(1.0);
      expect(mockProvider.generate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Regeneration Path', () => {
    it('regenerates with tightened prompt when validation fails on first attempt', async () => {
      sovereignHalo.validate
        .mockResolvedValueOnce(createMockReport('failed'))
        .mockResolvedValueOnce(createMockReport('passed'));
      
      mockProvider.generate
        .mockResolvedValueOnce({ text: 'Fail 1' })
        .mockResolvedValueOnce({ text: 'Pass 2' });

      const orchestrator = createOrchestrator(sovereignHalo);
      const result = await orchestrator.process({ query: 'test', identity_anchor: 'test-id' });

      expect(mockProvider.generate).toHaveBeenCalledTimes(2);
      expect(result.validationReport?.status).toBe('passed');
      
      const secondCallPrompt = mockProvider.generate.mock.calls[1][0].prompt;
      expect(secondCallPrompt).toContain('[Attempt 2]');
      expect(secondCallPrompt).toContain('Previous attempt failed these checks');
    });

    it('reduces temperature by 0.1 per regeneration attempt', async () => {
      sovereignHalo.validate
        .mockResolvedValueOnce(createMockReport('failed'))
        .mockResolvedValueOnce(createMockReport('passed'));
      
      const orchestrator = createOrchestrator(sovereignHalo);
      await orchestrator.process({ query: 'test', identity_anchor: 'test-id', temperature: 0.7 });

      expect(mockProvider.generate.mock.calls[0][0].temperature).toBe(0.7);
      expect(mockProvider.generate.mock.calls[1][0].temperature).toBe(0.6);
    });
  });

  describe('Failure After Max Attempts Path', () => {
    it('returns safe fallback message after 3 failed attempts', async () => {
      sovereignHalo.validate.mockResolvedValue(createMockReport('failed'));
      sovereignHalo.generateFailureReport.mockReturnValue({
        status: 'failed',
        attemptCount: 3,
        violationSummary: [],
        safeFallbackMessage: 'Safe fallback',
        lastValidationReport: createMockReport('failed'),
        identityId: 'test-id',
        generatedAt: new Date().toISOString()
      });

      const orchestrator = createOrchestrator(sovereignHalo);
      const result = await orchestrator.process({ query: 'test', identity_anchor: 'test-id' });

      expect(mockProvider.generate).toHaveBeenCalledTimes(3);
      expect(result.text).toBe('Safe fallback');
      expect(result.validationReport?.status).toBe('failed');
    });
  });

  describe('Backward Compatibility', () => {
    it('behaves identically to Phase 6 when sovereignHalo is not provided', async () => {
      const orchestrator = createOrchestrator(); // No halo
      const result = await orchestrator.process({ query: 'test', identity_anchor: 'test-id' });

      expect(mockProvider.generate).toHaveBeenCalledTimes(1);
      expect(result.validationReport).toBeUndefined();
      expect(result.reflectiveResult).toBeDefined(); // ReflectiveService fallback
    });
  });

  describe('Edge Cases', () => {
    it('handles null identity gracefully (skips validation)', async () => {
      identityBinding.resolveOrThrow.mockResolvedValue(null as any); // Simulate missing identity
      const orchestrator = createOrchestrator(sovereignHalo);
      
      // Should fallback to ReflectiveService
      const result = await orchestrator.process({ query: 'test', identity_anchor: 'missing' });
      
      expect(sovereignHalo.validate).not.toHaveBeenCalled();
      expect(result.validationReport).toBeUndefined();
    });
  });
});
