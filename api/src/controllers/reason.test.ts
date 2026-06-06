import { ReasonController } from './reason';
import { Orchestrator } from '../services/orchestrator';
import { ReflectiveService } from '../services/reflective-service';
import { AgentBuilder } from '../services/agent-builder';
import { MCPClient } from '../services/mcp-client';

jest.mock('../services/orchestrator');
jest.mock('../services/reflective-service');
jest.mock('../services/agent-builder');
jest.mock('../services/mcp-client');

describe('ReasonController', () => {
  let mockOrchestrator: jest.Mocked<Orchestrator>;
  let mockReflectiveService: jest.Mocked<ReflectiveService>;
  let mockAgentBuilder: jest.Mocked<AgentBuilder>;
  let controller: ReasonController;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrchestrator = {
      process: jest.fn().mockResolvedValue({
        id: 'test-id',
        text: 'Test response',
        context: {
          selectedProvider: 'gemini',
          relevantMemories: [],
        },
      }),
      generatePlan: jest.fn().mockResolvedValue({
        description: 'Test plan',
        estimatedSteps: 2,
        steps: [],
      }),
    } as any;

    mockReflectiveService = {
      check: jest.fn().mockResolvedValue({
        status: 'approved',
        violations: [],
        suggestedConstraints: [],
        confidenceScore: 1.0,
      }),
    } as any;

    mockAgentBuilder = {
      execute: jest.fn().mockResolvedValue({
        response: {
          id: 'test-id',
          output: 'Tool response',
          status: 'approved',
          identity_anchor: 'test',
          reasoning: {
            orchestrator: { selectedProvider: 'gemini', relevantMemoriesCount: 0, topMemories: [] },
            reflective: { status: 'approved', violations: [], suggestedConstraints: [], confidenceScore: 1.0 },
            trace: [],
          },
          metadata: { version: '1.0' },
        },
        toolCalls: [],
        toolResults: [],
        toolExecutionTrace: [],
      }),
      executeTask: jest.fn().mockResolvedValue({
        response: {
          id: 'task-id',
          output: 'Task response',
          status: 'approved',
          identity_anchor: 'test',
          reasoning: {
            orchestrator: { selectedProvider: 'gemini', relevantMemoriesCount: 0, topMemories: [] },
            reflective: { status: 'approved', violations: [], suggestedConstraints: [], confidenceScore: 1.0 },
            trace: [],
          },
          plan: {
            description: 'Test plan',
            estimatedSteps: 2,
            steps: [],
          },
          actions: [],
          planStatus: 'completed',
          metadata: { version: '1.0' },
        },
        toolCalls: [],
        toolResults: [],
        toolExecutionTrace: [],
      }),
    } as any;

    controller = new ReasonController(mockOrchestrator, mockReflectiveService, mockAgentBuilder);
  });

  describe('mode routing', () => {
    it('should route to executeTask when mode is explicitly set to task', async () => {
      const result = await controller.handleReason({
        identity_anchor: 'test',
        messages: [{ role: 'user', content: 'Hello' }],
        options: { enableTools: true, mode: 'task' },
      });

      expect(mockAgentBuilder.executeTask).toHaveBeenCalled();
      expect(mockAgentBuilder.execute).not.toHaveBeenCalled();
      expect(result.planStatus).toBe('completed');
    });

    it('should route to execute when mode is explicitly set to tool', async () => {
      const result = await controller.handleReason({
        identity_anchor: 'test',
        messages: [{ role: 'user', content: 'Hello' }],
        options: { enableTools: true, mode: 'tool' },
      });

      expect(mockAgentBuilder.execute).toHaveBeenCalled();
      expect(mockAgentBuilder.executeTask).not.toHaveBeenCalled();
    });

    it('should route to execute when mode is default (tool)', async () => {
      const result = await controller.handleReason({
        identity_anchor: 'test',
        messages: [{ role: 'user', content: 'Hello' }],
        options: { enableTools: true },
      });

      expect(mockAgentBuilder.execute).toHaveBeenCalled();
      expect(mockAgentBuilder.executeTask).not.toHaveBeenCalled();
    });
  });

  describe('auto-detection', () => {
    it('should auto-detect task mode for multi-step keywords', async () => {
      const result = await controller.handleReason({
        identity_anchor: 'test',
        messages: [{ role: 'user', content: 'Find all users and then update their status' }],
        options: { enableTools: true },
      });

      expect(mockAgentBuilder.executeTask).toHaveBeenCalled();
    });

    it('should auto-detect task mode for multiple verbs', async () => {
      const result = await controller.handleReason({
        identity_anchor: 'test',
        messages: [{ role: 'user', content: 'Query the database and update the records' }],
        options: { enableTools: true },
      });

      expect(mockAgentBuilder.executeTask).toHaveBeenCalled();
    });

    it('should stay in tool mode for simple queries', async () => {
      const result = await controller.handleReason({
        identity_anchor: 'test',
        messages: [{ role: 'user', content: 'What is the weather today?' }],
        options: { enableTools: true },
      });

      expect(mockAgentBuilder.execute).toHaveBeenCalled();
      expect(mockAgentBuilder.executeTask).not.toHaveBeenCalled();
    });
  });

  describe('response format', () => {
    it('should include plan and actions in task mode response', async () => {
      const result = await controller.handleReason({
        identity_anchor: 'test',
        messages: [{ role: 'user', content: 'Find and update' }],
        options: { enableTools: true, mode: 'task' },
      });

      expect(result.plan).toBeDefined();
      expect(result.actions).toBeDefined();
      expect(result.metadata.mode).toBe('task');
    });

    it('should not include plan in tool mode response', async () => {
      const result = await controller.handleReason({
        identity_anchor: 'test',
        messages: [{ role: 'user', content: 'Hello' }],
        options: { enableTools: true, mode: 'tool' },
      });

      expect(result.plan).toBeUndefined();
      expect(result.metadata.mode).toBe('tool');
    });
  });
});
