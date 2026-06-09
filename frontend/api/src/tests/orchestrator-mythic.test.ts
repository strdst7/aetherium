import { Orchestrator } from '../index';
import { IdentityBindingService } from '../services/identity-binding';
import { IdentityService } from '../services/identity-service';
import { MythicModuleService } from '../services/mythic-module';
import { SymbolicAnchorLoader } from '../services/symbolic-anchor-loader';

describe('Orchestrator Mythic Integration', () => {
  let orchestrator: Orchestrator;
  let bindingService: IdentityBindingService;
  let mythicModule: MythicModuleService;

  beforeEach(async () => {
    const identityService = new IdentityService();
    bindingService = new IdentityBindingService(identityService);
    const loader = new SymbolicAnchorLoader();
    mythicModule = new MythicModuleService(loader);
    await mythicModule.initialize();
    orchestrator = new Orchestrator(bindingService, mythicModule);
  });

  it('should inject mythic context and mythify output', async () => {
    jest.spyOn(bindingService, 'resolveOrThrow').mockResolvedValue({
      id: 'test',
      name: 'Test',
      description: 'Test',
      rules: [],
      config: {
        mythic: {
          tone: ['ceremonial'],
          voice: 'objective',
          symbolicAnchors: []
        }
      }
    });

    const result = await orchestrator.process({ query: 'test', identity_anchor: 'test' });
    expect(result.text).toContain('Hearken');
  });

  it('should use neutral identity when anchor is missing', async () => {
    const result = await orchestrator.process({ query: 'test', identity_anchor: '' });
    expect(result.text).toBe('mock'); // No mythification applied
  });

  it('should maintain backward compatibility if mythic module is omitted', async () => {
    const legacyOrchestrator = new Orchestrator(bindingService);
    const result = await legacyOrchestrator.process({ query: 'test', identity_anchor: '' });
    expect(result.text).toBe('mock');
  });
});
