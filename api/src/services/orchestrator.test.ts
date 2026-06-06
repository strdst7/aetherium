import { Orchestrator } from './orchestrator';
import { ProviderRegistry } from './provider-registry';
import { MemoryService } from './memory-service';
import { ReflectiveService } from './reflective-service';

// Mock the dependencies
jest.mock('./provider-registry');
jest.mock('./memory-service');
jest.mock('./reflective-service');

describe('Orchestrator', () => {
  let mockProvider: any;
  let mockRegistry: jest.Mocked<ProviderRegistry>;
  let mockMemoryService: jest.Mocked<MemoryService>;
  let mockReflectiveService: jest.Mocked<ReflectiveService>;
  let orchestrator: Orchestrator;

  beforeEach(() => {
    // Setup mock provider
    mockProvider = {
      name: 'mock-provider',
      embed: jest.fn().mockResolvedValue({ embeddings: [0.1, 0.2, 0.3] }),
      generate: jest.fn()
        .mockResolvedValueOnce({ id: 'id-1', text: 'Original response' })
        .mockResolvedValueOnce({ id: 'id-2', text: 'Refined response' })
    };

    // Setup mock registry
    mockRegistry = {
      pick: jest.fn(),
      register: jest.fn(),
      reset: jest.fn(),
      listProviders: jest.fn(),
    } as any;
    mockRegistry.pick.mockResolvedValue(mockProvider);

    // Setup mock memory service
    mockMemoryService = new MemoryService() as jest.Mocked<MemoryService>;
    mockMemoryService.vectorSearch.mockResolvedValue([
      {
        doc: { id: 'mem_1', content: 'Info' },
        score: 0.9
      }
    ]);

    // Setup mock reflective service
    mockReflectiveService = new ReflectiveService() as jest.Mocked<ReflectiveService>;
    (ReflectiveService as jest.Mock).mockImplementation(() => ({
      evaluate: jest.fn().mockReturnValue({ status: 'approved', violations: [] })
    }));

    orchestrator = new Orchestrator(mockMemoryService, mockRegistry);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully orchestrate reasoning without refinement', async () => {
    const result = await orchestrator.process({
      identity_anchor: 'anchor',
      messages: [{ role: 'user', content: 'Query' }]
    });

    expect(result.text).toBe('Original response');
    expect(result.refinedCandidate).toBeUndefined();
    expect(mockProvider.generate).toHaveBeenCalledTimes(1);
  });

  it('should trigger re-generation when refinement is required', async () => {
    // Override mock to return 'refine'
    const mockEvaluate = jest.fn().mockReturnValue({
      status: 'refine',
      violations: [{ message: 'Geometry violation' }]
    });
    
    (ReflectiveService as jest.Mock).mockImplementation(() => ({
      evaluate: mockEvaluate
    }));
    
    orchestrator = new Orchestrator(mockMemoryService, mockRegistry);

    const result = await orchestrator.process({
      identity_anchor: 'anchor',
      messages: [{ role: 'user', content: 'Query' }]
    });

    expect(result.text).toBe('Original response');
    expect(result.refinedCandidate.text).toBe('Refined response');
    expect(mockProvider.generate).toHaveBeenCalledTimes(2);
    
    // Check that the second call received constraints
    const secondCall = mockProvider.generate.mock.calls[1][0];
    expect(secondCall.prompt).toContain('Constraints:');
    expect(secondCall.prompt).toContain('- Geometry violation');
  });
});
