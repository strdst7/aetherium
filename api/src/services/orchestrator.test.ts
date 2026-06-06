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

  describe('generatePlan', () => {
    it('should generate a structured plan from a natural language request', async () => {
      const mockPlanResponse = {
        id: 'plan-1',
        text: JSON.stringify({
          description: 'Find inactive users',
          estimatedSteps: 2,
          steps: [
            {
              stepNumber: 1,
              tool: 'query',
              args: { status: 'inactive' },
              expectedResult: 'List of inactive users'
            },
            {
              stepNumber: 2,
              tool: 'update',
              args: { status: 'active' },
              expectedResult: 'Updated user statuses'
            }
          ]
        })
      };

      mockProvider.generateWithTools = jest.fn().mockResolvedValue(mockPlanResponse);
      mockRegistry.pick.mockResolvedValue(mockProvider);

      const result = await orchestrator.generatePlan({
        identity_anchor: 'anchor',
        messages: [{ role: 'user', content: 'Find inactive users and update their status' }]
      }, [
        { name: 'query', description: 'Query users', parameters: {} },
        { name: 'update', description: 'Update users', parameters: {} }
      ]);

      expect(result.description).toBe('Find inactive users');
      expect(result.estimatedSteps).toBe(2);
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].tool).toBe('query');
      expect(result.steps[1].tool).toBe('update');
    });

    it('should handle malformed plan responses gracefully', async () => {
      mockProvider.generateWithTools = jest.fn().mockResolvedValue({
        id: 'plan-2',
        text: 'Invalid JSON response'
      });
      mockRegistry.pick.mockResolvedValue(mockProvider);

      const result = await orchestrator.generatePlan({
        identity_anchor: 'anchor',
        messages: [{ role: 'user', content: 'Do something' }]
      }, [
        { name: 'query', description: 'Query tool', parameters: {} }
      ]);

      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].status).toBe('pending');
    });

    it('should throw error when provider does not support tool use', async () => {
      mockProvider.generateWithTools = undefined;
      mockRegistry.pick.mockResolvedValue(mockProvider);

      await expect(orchestrator.generatePlan({
        identity_anchor: 'anchor',
        messages: [{ role: 'user', content: 'Do something' }]
      }, [])).rejects.toThrow('Provider does not support tool use');
    });
  });
});
