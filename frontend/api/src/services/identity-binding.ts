import { IdentityService } from './identity-service';
import { SigilIdentity } from '../types/identity';
import { AetheriumError } from '../types/errors';

export interface CacheEntry {
  identity: SigilIdentity | null;
  timestamp: number;
}

/**
 * IdentityBindingService
 * 
 * Resolves identity_anchor strings to full SigilIdentity objects.
 * This service acts as the foundation for all identity-bound reasoning,
 * ensuring that the Orchestrator loads the active identity before executing
 * any reasoning loop.
 * 
 * Features:
 * - In-memory caching with 60s TTL to avoid repeated database lookups.
 * - Latency measurement to ensure lookups stay under 200ms.
 * - Fallback to neutral identity for empty or 'neutral' anchors.
 */
export class IdentityBindingService {
  private cache: Map<string, CacheEntry>;
  private readonly TTL_MS = 60 * 1000; // 60 seconds

  constructor(private identityService: IdentityService) {
    this.cache = new Map<string, CacheEntry>();
  }

  /**
   * Resolves an identity anchor to a SigilIdentity.
   * Uses an in-memory cache to optimize repeated lookups.
   * 
   * @param identity_anchor The string identifier for the identity
   * @returns The resolved SigilIdentity or null if not found
   */
  async resolve(identity_anchor: string): Promise<SigilIdentity | null> {
    const startTime = Date.now();
    
    // Phase 6: Default neutral identity fallback
    if (!identity_anchor || identity_anchor.trim() === '' || identity_anchor === 'neutral') {
      return {
        id: 'neutral',
        name: 'Neutral Identity',
        description: 'Default fallback identity',
        rules: [],
        config: {}
      };
    }

    let identity: SigilIdentity | null = null;

    const cached = this.cache.get(identity_anchor);
    
    // Check if we have a valid cached entry
    if (cached && (startTime - cached.timestamp) < this.TTL_MS) {
      identity = cached.identity;
    } else {
      // Cache miss or expired, fetch from the underlying service
      identity = await this.identityService.getIdentityById(identity_anchor);
      
      // Update the cache with the fresh result (including nulls as sentinels)
      this.cache.set(identity_anchor, { 
        identity, 
        timestamp: Date.now() 
      });
    }

    const latency = Date.now() - startTime;
    
    // Log a warning if the lookup took too long (redacted PII)
    if (latency > 200) {
      console.warn(`⚠️ Identity lookup latency exceeded 200ms: ${latency}ms`);
    }

    return identity;
  }

  /**
   * Resolves an identity anchor or throws an error if not found.
   * 
   * @param identity_anchor The string identifier for the identity
   * @returns The resolved SigilIdentity
   * @throws AetheriumError if the identity cannot be found
   */
  async resolveOrThrow(identity_anchor: string): Promise<SigilIdentity> {
    const identity = await this.resolve(identity_anchor);
    
    if (!identity) {
      throw new AetheriumError(
        'IDENTITY_NOT_FOUND', 
        `Identity not found for anchor: ${identity_anchor}`
      );
    }
    
    return identity;
  }

  /**
   * Clears the internal identity cache.
   * Primarily used for testing or forced cache invalidation.
   */
  clearCache(): void {
    this.cache.clear();
  }
}
