import { IdentityBindingService } from './identity-binding';
import { IdentityService } from './identity-service';
import { SigilIdentity } from '../types/identity';
import { AetheriumError } from '../types/errors';

// Mock IdentityService
jest.mock('./identity-service');

describe('IdentityBindingService', () => {
  let identityService: jest.Mocked<IdentityService>;
  let bindingService: IdentityBindingService;

  const mockIdentity: SigilIdentity = {
    id: 'sigil:v1:halo-arc:001',
    name: 'Halo Arc',
    description: 'Test identity',
    rules: ['Rule 1', 'Rule 2']
  };

  beforeEach(() => {
    identityService = new IdentityService() as jest.Mocked<IdentityService>;
    bindingService = new IdentityBindingService(identityService);
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should resolve and return identity when found', async () => {
    identityService.getIdentityById.mockResolvedValue(mockIdentity);
    
    const result = await bindingService.resolve('sigil:v1:halo-arc:001');
    
    expect(result).toEqual(mockIdentity);
    expect(identityService.getIdentityById).toHaveBeenCalledWith('sigil:v1:halo-arc:001');
  });

  it('should return null when identity is not found', async () => {
    identityService.getIdentityById.mockResolvedValue(null);
    
    const result = await bindingService.resolve('unknown-anchor');
    
    expect(result).toBeNull();
  });

  it('should throw AetheriumError when resolveOrThrow is called and identity is not found', async () => {
    identityService.getIdentityById.mockResolvedValue(null);
    
    await expect(bindingService.resolveOrThrow('unknown-anchor'))
      .rejects
      .toThrow(AetheriumError);
      
    await expect(bindingService.resolveOrThrow('unknown-anchor'))
      .rejects
      .toMatchObject({ code: 'IDENTITY_NOT_FOUND' });
  });

  it('should return cached identity without calling service again', async () => {
    identityService.getIdentityById.mockResolvedValue(mockIdentity);
    
    await bindingService.resolve('sigil:v1:halo-arc:001');
    await bindingService.resolve('sigil:v1:halo-arc:001');
    
    expect(identityService.getIdentityById).toHaveBeenCalledTimes(1);
  });

  it('should expire cache after TTL', async () => {
    identityService.getIdentityById.mockResolvedValue(mockIdentity);
    
    await bindingService.resolve('sigil:v1:halo-arc:001');
    
    // Advance time by 61 seconds (TTL is 60s)
    jest.advanceTimersByTime(61000);
    
    await bindingService.resolve('sigil:v1:halo-arc:001');
    
    expect(identityService.getIdentityById).toHaveBeenCalledTimes(2);
  });

  it('should measure latency and log warning if > 200ms', async () => {
    identityService.getIdentityById.mockImplementation(async () => {
      // Simulate a slow database lookup
      jest.advanceTimersByTime(250);
      return mockIdentity;
    });

    await bindingService.resolve('sigil:v1:halo-arc:001');
    
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('⚠️ Identity lookup latency exceeded 200ms')
    );
  });
});
