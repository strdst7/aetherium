import { MythicModuleService } from '../services/mythic-module';
import { SymbolicAnchorLoader } from '../services/symbolic-anchor-loader';

describe('Mythic Latency Budget', () => {
  it('should mythify within latency budget', async () => {
    const loader = new SymbolicAnchorLoader();
    const service = new MythicModuleService(loader);
    await service.initialize();

    const identity = {
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
    };

    const start = Date.now();
    await service.mythify(identity, 'test text');
    const latency = Date.now() - start;

    expect(latency).toBeLessThanOrEqual(200);
  });
});
