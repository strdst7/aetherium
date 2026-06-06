import { MockAgentBuilder } from './mock-agent-builder';
import { ReasonRequest } from '../types/api-contracts';

describe('MockAgentBuilder', () => {
  let mockAgentBuilder: MockAgentBuilder;

  beforeEach(() => {
    mockAgentBuilder = new MockAgentBuilder();
  });

  describe('execute', () => {
    it('should return a mock response without tools when tools are disabled', async () => {
      const req: ReasonRequest = {
        identity_anchor: 'test-anchor',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = await mockAgentBuilder.execute(req, { enableTools: false });
      
      expect(result.response.output).toBe('Mock response without tools');
      expect(result.response.identity_anchor).toBe('test-anchor');
      expect(result.toolCalls).toBeUndefined();
    });

    it('should return a mock response with tools when tools are enabled', async () => {
      const req: ReasonRequest = {
        identity_anchor: 'test-anchor',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = await mockAgentBuilder.execute(req, { enableTools: true });
      
      expect(result.response.output).toBe('Mock response with tools');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls?.[0].name).toBe('echo');
    });
  });

  describe('executeTask', () => {
    it('should return a mock task response with plan and actions', async () => {
      const req: ReasonRequest = {
        identity_anchor: 'test-anchor',
        messages: [{ role: 'user', content: 'Find inactive users and update their status' }],
      };

      const result = await mockAgentBuilder.executeTask(req, { maxTaskIterations: 10 });
      
      expect(result.response.output).toContain('Mock task execution completed');
      expect(result.response.plan).toBeDefined();
      expect(result.response.plan?.steps).toHaveLength(2);
      expect(result.response.actions).toHaveLength(2);
      expect(result.response.planStatus).toBe('completed');
      expect(result.toolCalls).toHaveLength(2);
      expect(result.toolCalls?.[0].name).toBe('query');
      expect(result.toolCalls?.[1].name).toBe('update');
    });

    it('should include correct action types in the response', async () => {
      const req: ReasonRequest = {
        identity_anchor: 'test-anchor',
        messages: [{ role: 'user', content: 'Do something' }],
      };

      const result = await mockAgentBuilder.executeTask(req);
      
      expect(result.response.actions?.[0].type).toBe('report');
      expect(result.response.actions?.[1].type).toBe('update');
      expect(result.response.actions?.[0].format).toBe('json');
    });
  });
});
