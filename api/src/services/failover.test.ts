import { ProviderRegistry } from './provider-registry';
import { OllamaProvider, setForceFail } from '../adapters/ollama-provider';
import { MockProvider, setMockForceFail } from '../adapters/mock-provider';

describe('Provider Failover Integration', () => {
  let registry: ProviderRegistry;
  let ollama: OllamaProvider;
  let mock: MockProvider;

  beforeEach(() => {
    registry = ProviderRegistry.instance;
    registry.reset();
    ollama = new OllamaProvider('http://localhost:11434');
    mock = new MockProvider();
    
    // Reset force fail states
    setForceFail(false);
    setMockForceFail(false);

    // Register: Ollama (10) > Mock (50)
    registry.register(ollama, 10);
    registry.register(mock, 50);
  });

  it('should pick Ollama when it is healthy (primary)', async () => {
    // Mock healthy response
    jest.spyOn(ollama, 'healthCheck').mockResolvedValue({ ok: true });
    
    const picked = await registry.pick();
    expect(picked.name).toBe('ollama');
  });

  it('should fallback to Mock when Ollama is unhealthy', async () => {
    // Simulate Ollama failure
    setForceFail(true);
    
    const picked = await registry.pick();
    expect(picked.name).toBe('mock');
  });

  it('should throw when both providers are unhealthy', async () => {
    setForceFail(true);
    setMockForceFail(true);
    
    await expect(registry.pick()).rejects.toThrow('No healthy providers available');
  });
});
