import { IdentityBindingService } from '../services/identity-binding';
import { IdentityService } from '../services/identity-service';
import { SigilIdentity } from '../types/identity';

describe('Identity Performance & Latency Tests', () => {
  let identityService: IdentityService;
  let bindingService: IdentityBindingService;

  const mockIdentity: SigilIdentity = {
    id: 'sigil:v1:perf:001',
    name: 'Perf Identity',
    description: 'Performance test identity',
    rules: ['Rule A', 'Rule B']
  };

  beforeEach(() => {
    identityService = new IdentityService();
    bindingService = new IdentityBindingService(identityService);
  });

  it('should measure identity lookup latency and ensure it is <200ms', async () => {
    jest.spyOn(identityService, 'getIdentityById').mockImplementation(async () => {
      // Simulate 50ms DB latency
      await new Promise(resolve => setTimeout(resolve, 50));
      return mockIdentity;
    });

    const start = Date.now();
    await bindingService.resolve('sigil:v1:perf:001');
    const end = Date.now();

    const latency = end - start;
    expect(latency).toBeLessThan(200);
    expect(latency).toBeGreaterThanOrEqual(50);
  });

  it('should measure total request latency with identity and ensure it is <5s', async () => {
    // Simulate a full request pipeline taking some time
    const simulatePipeline = async () => {
      await bindingService.resolve('sigil:v1:perf:001');
      // Simulate LLM/Orchestrator processing time
      await new Promise(resolve => setTimeout(resolve, 100)); 
    };

    jest.spyOn(identityService, 'getIdentityById').mockResolvedValue(mockIdentity);

    const start = Date.now();
    await simulatePipeline();
    const end = Date.now();

    const totalLatency = end - start;
    expect(totalLatency).toBeLessThan(5000);
  });

  it('should ensure cached identity lookup is <10ms', async () => {
    jest.spyOn(identityService, 'getIdentityById').mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return mockIdentity;
    });

    // First lookup (uncached, takes ~50ms)
    await bindingService.resolve('sigil:v1:perf:001');

    // Second lookup (cached, should be near 0ms)
    const start = Date.now();
    await bindingService.resolve('sigil:v1:perf:001');
    const end = Date.now();

    const cachedLatency = end - start;
    expect(cachedLatency).toBeLessThan(10);
  });

  it('should ensure uncached identity lookup is <200ms', async () => {
    jest.spyOn(identityService, 'getIdentityById').mockImplementation(async () => {
      // Simulate a slower DB query that is still within bounds
      await new Promise(resolve => setTimeout(resolve, 150)); 
      return mockIdentity;
    });

    const start = Date.now();
    await bindingService.resolve('sigil:v1:perf:002');
    const end = Date.now();

    const uncachedLatency = end - start;
    expect(uncachedLatency).toBeLessThan(200);
    expect(uncachedLatency).toBeGreaterThanOrEqual(150);
  });
});
