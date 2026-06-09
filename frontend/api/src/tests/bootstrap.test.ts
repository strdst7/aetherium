import { app, orchestrator, multiAgentOrchestrator } from '../index';

describe('Bootstrap Wiring', () => {
  it('should initialize orchestrators with mythic module', () => {
    expect(orchestrator).toBeDefined();
    expect(orchestrator.mythicModule).toBeDefined();
    expect(multiAgentOrchestrator).toBeDefined();
  });
});
