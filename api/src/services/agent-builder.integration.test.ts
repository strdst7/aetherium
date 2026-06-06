import { AgentBuilder } from './agent-builder';
import { Orchestrator } from './orchestrator';
import { MCPClient } from './mcp-client';
import { ProviderRegistry } from './provider-registry';
import { MemoryService } from './memory-service';
import { ReflectiveService } from './reflective-service';
import { ReasonRequest } from '../types/api-contracts';

// Integration test for MongoDB Assistant Challenge
// This test demonstrates the full pipeline: plan → query → update → action synthesis

describe('MongoDB Assistant Integration', () => {
  let orchestrator: Orchestrator;
  let mcpClient: MCPClient;
  let agentBuilder: AgentBuilder;
  let mockProvider: any;
  let mockRegistry: any;
  let mockMemoryService: any;

  beforeEach(() => {
    // Setup mock provider with generateWithTools support
    mockProvider = {
      name: 'gemini',
      embed: jest.fn().mockResolvedValue({ embeddings: [0.1, 0.2, 0.3] }),
      generate: jest.fn().mockResolvedValue({ id: 'gen-1', text: 'Response' }),
      generateWithTools: jest.fn().mockImplementation((req: any, tools: any[]) => {
        const prompt = req.prompt || '';
        
        // Simulate plan generation
        if (prompt.includes('task planner')) {
          return Promise.resolve({
            id: 'plan-1',
            text: JSON.stringify({
              description: 'Find inactive users and update their status',
              estimatedSteps: 2,
              steps: [
                {
                  stepNumber: 1,
                  tool: 'query',
                  args: { collection: 'users', filter: { status: 'inactive' } },
                  expectedResult: 'List of inactive users'
                },
                {
                  stepNumber: 2,
                  tool: 'update',
                  args: { collection: 'users', filter: { status: 'inactive' }, update: { status: 'active' } },
                  expectedResult: 'Updated user statuses'
                }
              ]
            })
          });
        }
        
        // Simulate tool execution
        return Promise.resolve({
          id: 'exec-1',
          text: 'Tool executed',
          toolCalls: []
        });
      }),
    };

    // Setup mock registry
    mockRegistry = {
      pick: jest.fn().mockResolvedValue(mockProvider),
      register: jest.fn(),
      reset: jest.fn(),
      listProviders: jest.fn().mockReturnValue([mockProvider]),
    };

    // Setup mock memory service
    mockMemoryService = {
      vectorSearch: jest.fn().mockResolvedValue([]),
      connect: jest.fn().mockResolvedValue(undefined),
    };

    // Create real services with mocks
    orchestrator = new Orchestrator(mockMemoryService, mockRegistry);
    mcpClient = new MCPClient('mock-server-path');
    
    // Mock MCP client methods
    jest.spyOn(mcpClient, 'start').mockResolvedValue(undefined);
    jest.spyOn(mcpClient, 'discoverTools').mockResolvedValue([
      { name: 'query', description: 'Query database', parameters: {} },
      { name: 'update', description: 'Update database', parameters: {} },
    ]);
    jest.spyOn(mcpClient, 'executeTool').mockImplementation((name: string, args: any) => {
      if (name === 'query') {
        return Promise.resolve({
          success: true,
          data: [
            { id: 'user-002', name: 'Bob Smith', status: 'inactive' },
            { id: 'user-004', name: 'David Wilson', status: 'inactive' },
            { id: 'user-006', name: 'Frank Miller', status: 'inactive' },
          ]
        });
      }
      if (name === 'update') {
        return Promise.resolve({
          success: true,
          data: { modifiedCount: 3, matchedCount: 3 }
        });
      }
      return Promise.resolve({ success: false, error: 'Unknown tool' });
    });
    jest.spyOn(mcpClient, 'isHealthy').mockReturnValue(true);
    jest.spyOn(mcpClient, 'stop').mockResolvedValue(undefined);

    agentBuilder = new AgentBuilder(orchestrator, mcpClient, {
      enableTools: true,
      maxToolIterations: 5,
      maxTaskIterations: 10,
    });
  });

  afterEach(async () => {
    await agentBuilder.shutdown();
    jest.restoreAllMocks();
  });

  it('should complete the MongoDB assistant challenge: find inactive users and update status', async () => {
    await agentBuilder.initialize();

    const req: ReasonRequest = {
      identity_anchor: 'test-anchor',
      messages: [{ role: 'user', content: 'Find all inactive users and update their status to active' }],
      options: {
        enableTools: true,
        mode: 'task',
      },
    };

    const result = await agentBuilder.executeTask(req);

    // Verify plan structure
    expect(result.response.plan).toBeDefined();
    expect(result.response.plan?.description).toContain('inactive users');
    expect(result.response.plan?.steps).toHaveLength(2);
    expect(result.response.plan?.steps[0].tool).toBe('query');
    expect(result.response.plan?.steps[1].tool).toBe('update');

    // Verify plan status
    expect(result.response.planStatus).toBe('completed');

    // Verify actions
    expect(result.response.actions).toBeDefined();
    expect(result.response.actions?.length).toBeGreaterThan(0);
    
    // Check for report action (query results)
    const reportAction = result.response.actions?.find(a => a.type === 'report');
    expect(reportAction).toBeDefined();
    expect(reportAction?.data).toBeDefined();

    // Check for update action (update results)
    const updateAction = result.response.actions?.find(a => a.type === 'update');
    expect(updateAction).toBeDefined();
    expect(updateAction?.data).toBeDefined();

    // Verify tool execution trace
    expect(result.toolExecutionTrace).toBeDefined();
    expect(result.toolExecutionTrace?.length).toBe(2);
    
    // Verify tool calls
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls?.[0].name).toBe('query');
    expect(result.toolCalls?.[1].name).toBe('update');

    // Verify tool results
    expect(result.toolResults).toHaveLength(2);
    expect(result.toolResults?.[0].success).toBe(true);
    expect(result.toolResults?.[1].success).toBe(true);

    // Verify output contains completion message
    expect(result.response.output).toContain('completed');
  });

  it('should handle query failure gracefully with retry', async () => {
    jest.spyOn(mcpClient, 'executeTool').mockImplementation((name: string, args: any) => {
      if (name === 'query') {
        // Fail first, succeed on retry
        if (args._retry) {
          return Promise.resolve({
            success: true,
            data: [{ id: 'user-002', name: 'Bob Smith', status: 'inactive' }]
          });
        }
        return Promise.resolve({ success: false, error: 'Connection timeout' });
      }
      if (name === 'update') {
        return Promise.resolve({
          success: true,
          data: { modifiedCount: 1, matchedCount: 1 }
        });
      }
      return Promise.resolve({ success: false, error: 'Unknown tool' });
    });

    await agentBuilder.initialize();

    const req: ReasonRequest = {
      identity_anchor: 'test-anchor',
      messages: [{ role: 'user', content: 'Find inactive users and update them' }],
      options: { enableTools: true, mode: 'task' },
    };

    const result = await agentBuilder.executeTask(req);

    // Should still complete with retry
    expect(result.response.planStatus).toBe('completed');
    expect(result.response.actions?.length).toBeGreaterThan(0);
  });

  it('should produce structured action types correctly', async () => {
    await agentBuilder.initialize();

    const req: ReasonRequest = {
      identity_anchor: 'test-anchor',
      messages: [{ role: 'user', content: 'Query users and update their status' }],
      options: { enableTools: true, mode: 'task' },
    };

    const result = await agentBuilder.executeTask(req);

    // Verify all actions have required fields
    expect(result.response.actions).toBeDefined();
    result.response.actions?.forEach(action => {
      expect(action.type).toBeDefined();
      expect(['report', 'update', 'trigger', 'notify']).toContain(action.type);
      expect(action.title).toBeDefined();
      expect(action.data).toBeDefined();
      expect(action.format).toBeDefined();
    });
  });
});
