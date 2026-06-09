import { MultiAgentOrchestrator, Archivist, SigilKeeper, Narrator } from './multi-agent-orchestrator';
import { MemoryService } from './memory-service';
import { ReflectiveService } from './reflective-service';
import { IdentityBindingService } from './identity-binding';
import { SovereignHaloService } from './sovereign-halo';
import { SigilIdentity } from '../types/identity';
import { ValidationReport } from '../types/halo';

jest.mock('./memory-service');
jest.mock('./reflective-service');
jest.mock('./identity-binding');
jest.mock('./sovereign-halo');

describe('MultiAgentOrchestrator', () => {
  let memoryService: jest.Mocked<MemoryService>;
  let reflectiveService: jest.Mocked<ReflectiveService>;
  let identityBinding: jest.Mocked<IdentityBindingService>;
  let sovereignHalo: jest.Mocked<SovereignHaloService>;
  let orchestrator: MultiAgentOrchestrator;

  const mockIdentity: SigilIdentity = {
    id: 'test-id',
    name: 'Test',
    description: 'Test',
    rules: []
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

  beforeEach(() => {
    memoryService = new MemoryService() as jest.Mocked<MemoryService>;
    reflectiveService = new ReflectiveService() as jest.Mocked<ReflectiveService>;
    identityBinding = new IdentityBindingService({} as any) as jest.Mocked<IdentityBindingService>;
    sovereignHalo = new SovereignHaloService({} as any, {} as any) as jest.Mocked<SovereignHaloService>;

    identityBinding.resolveOrThrow.mockResolvedValue(mockIdentity);
    sovereignHalo.validate.mockResolvedValue(createMockReport('passed'));

    orchestrator = new MultiAgentOrchestrator(memoryService, reflectiveService, identityBinding, sovereignHalo);
    
    // Spy on agent act methods
    jest.spyOn(orchestrator.archivist, 'act');
    jest.spyOn(orchestrator.sigilKeeper, 'act');
    jest.spyOn(orchestrator.narrator, 'act');
  });

  it('validates all council agent outputs when sovereignHalo is provided', async () => {
    await orchestrator.runFlow('test query', 'test-id');

    expect(sovereignHalo.validate).toHaveBeenCalledTimes(3); // Archivist, SigilKeeper, Narrator
  });

  it('includes validationReport for each agent in response when validation passes', async () => {
    const result = await orchestrator.runFlow('test query', 'test-id');

    expect(result.archivist.validationReport?.status).toBe('passed');
    expect(result.sigilKeeper.validationReport?.status).toBe('passed');
    expect(result.narrator.validationReport?.status).toBe('passed');
  });

  it('does not validate when sovereignHalo is not provided (backward compatibility)', async () => {
    const legacyOrchestrator = new MultiAgentOrchestrator(memoryService, reflectiveService, identityBinding);
    const result = await legacyOrchestrator.runFlow('test query', 'test-id');

    expect(sovereignHalo.validate).not.toHaveBeenCalled();
    expect(result.archivist.validationReport).toBeUndefined();
  });

  it('regenerates agent output when validation fails on first attempt', async () => {
    // Fail first attempt for Archivist, pass second
    sovereignHalo.validate
      .mockResolvedValueOnce(createMockReport('failed'))
      .mockResolvedValueOnce(createMockReport('passed'))
      .mockResolvedValue(createMockReport('passed')); // Pass others

    await orchestrator.runFlow('test query', 'test-id');

    // Archivist should have been called twice
    expect(orchestrator.archivist.act).toHaveBeenCalledTimes(2);
    
    // Second call should include constraints
    const secondCallArgs = (orchestrator.archivist.act as jest.Mock).mock.calls[1];
    expect(secondCallArgs[0]).toContain('[Constraints:');
  });

  it('uses regenerated output in downstream agent context', async () => {
    sovereignHalo.validate
      .mockResolvedValueOnce(createMockReport('failed'))
      .mockResolvedValueOnce(createMockReport('passed'))
      .mockResolvedValue(createMockReport('passed'));

    jest.spyOn(orchestrator.archivist, 'act')
      .mockResolvedValueOnce({ output: 'Bad output' })
      .mockResolvedValueOnce({ output: 'Good output' });

    const result = await orchestrator.runFlow('test query', 'test-id');

    expect(result.archivist.output).toBe('Good output');
  });

  it('returns failed validation report when regeneration also fails', async () => {
    // Fail both attempts for Narrator
    sovereignHalo.validate
      .mockResolvedValueOnce(createMockReport('passed')) // Archivist
      .mockResolvedValueOnce(createMockReport('passed')) // SigilKeeper
      .mockResolvedValueOnce(createMockReport('failed')) // Narrator 1
      .mockResolvedValueOnce(createMockReport('failed')); // Narrator 2

    const result = await orchestrator.runFlow('test query', 'test-id');

    expect(result.narrator.validationReport?.status).toBe('failed');
    expect(orchestrator.narrator.act).toHaveBeenCalledTimes(2);
  });

  it('handles null identity gracefully (skips all validation)', async () => {
    identityBinding.resolveOrThrow.mockResolvedValue(null as any);
    
    const result = await orchestrator.runFlow('test query', 'missing-id');

    expect(sovereignHalo.validate).not.toHaveBeenCalled();
    expect(result.archivist.validationReport).toBeUndefined();
  });

  it('handles empty agent output gracefully', async () => {
    jest.spyOn(orchestrator.narrator, 'act').mockResolvedValue({ output: '' });
    
    const result = await orchestrator.runFlow('test query', 'test-id');
    
    expect(result.narrator.output).toBe('');
    expect(sovereignHalo.validate).toHaveBeenCalled();
  });

  it('preserves existing multi-agent flow when sovereignHalo is absent', async () => {
    const legacyOrchestrator = new MultiAgentOrchestrator(memoryService, reflectiveService, identityBinding);
    const result = await legacyOrchestrator.runFlow('test query', 'test-id');

    expect(result.archivist.output).toContain('Archivist context');
    expect(result.sigilKeeper.output).toContain('SigilKeeper review');
    expect(result.narrator.output).toContain('Narrator synthesis');
  });
});
