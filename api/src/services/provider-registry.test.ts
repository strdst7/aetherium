import { ProviderRegistry } from './provider-registry';
import { AIProvider } from '../adapters/ai-adapter';

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = ProviderRegistry.instance;
    registry.reset();
  });

  it('should pick the highest priority healthy provider', async () => {
    const p1: any = { 
      name: 'low-priority', 
      capabilities: { supportsEmbeddings: true },
      healthCheck: jest.fn().mockResolvedValue({ ok: true }) 
    };
    const p2: any = { 
      name: 'high-priority', 
      capabilities: { supportsEmbeddings: true },
      healthCheck: jest.fn().mockResolvedValue({ ok: true }) 
    };

    registry.register(p1, 100);
    registry.register(p2, 10);

    const picked = await registry.pick();
    expect(picked.name).toBe('high-priority');
    expect(p2.healthCheck).toHaveBeenCalled();
  });

  it('should skip unhealthy providers', async () => {
    const p1: any = { 
      name: 'healthy-low', 
      capabilities: { supportsEmbeddings: true },
      healthCheck: jest.fn().mockResolvedValue({ ok: true }) 
    };
    const p2: any = { 
      name: 'unhealthy-high', 
      capabilities: { supportsEmbeddings: true },
      healthCheck: jest.fn().mockResolvedValue({ ok: false }) 
    };

    registry.register(p1, 100);
    registry.register(p2, 10);

    const picked = await registry.pick();
    expect(picked.name).toBe('healthy-low');
    expect(p2.healthCheck).toHaveBeenCalled();
    expect(p1.healthCheck).toHaveBeenCalled();
  });

  it('should throw error if no healthy providers available', async () => {
    const p1: any = { 
      name: 'unhealthy', 
      capabilities: { supportsEmbeddings: true },
      healthCheck: jest.fn().mockResolvedValue({ ok: false }) 
    };

    registry.register(p1, 10);

    await expect(registry.pick()).rejects.toThrow('No healthy providers available');
  });

  it('should assume healthy if healthCheck is missing', async () => {
    const p1: any = { name: 'no-check', capabilities: { supportsEmbeddings: true } };
    registry.register(p1, 10);

    const picked = await registry.pick();
    expect(picked.name).toBe('no-check');
  });

  it('should filter providers by tool-use capability', async () => {
    const p1: any = {
      name: 'no-tool-use',
      capabilities: { supportsEmbeddings: true, supportsToolUse: false },
      healthCheck: jest.fn().mockResolvedValue({ ok: true }),
    };
    const p2: any = {
      name: 'tool-use',
      capabilities: { supportsEmbeddings: true, supportsToolUse: true },
      healthCheck: jest.fn().mockResolvedValue({ ok: true }),
    };

    registry.register(p1, 10);
    registry.register(p2, 20);

    const picked = await registry.pick({ requireToolUse: true });
    expect(picked.name).toBe('tool-use');
  });

  it('should throw if no providers support tool-use', async () => {
    const p1: any = {
      name: 'no-tool-use',
      capabilities: { supportsEmbeddings: true, supportsToolUse: false },
      healthCheck: jest.fn().mockResolvedValue({ ok: true }),
    };

    registry.register(p1, 10);

    await expect(registry.pick({ requireToolUse: true })).rejects.toThrow('No healthy providers available');
  });
});
