import { IdentityService } from "./identity-service";
import { SigilIdentity } from "../types/identity";
import { AetheriumError, ErrorCode } from "../middleware/error-handler";

interface CacheEntry {
  identity: SigilIdentity | null;
  timestamp: number;
}

/**
 * IdentityBindingService resolves identity_anchor strings to full SigilIdentity objects.
 * 
 * Features:
 * - In-memory cache with TTL (60 seconds) to avoid repeated MongoDB lookups
 * - Separate shorter TTL (5 seconds) for null/not-found results
 * - Latency measurement for every lookup
 * - Warning if latency exceeds 200ms
 * - Graceful handling of missing identities
 */
export class IdentityBindingService {
  private identityService: IdentityService;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTtlMs: number = 60000; // 60 seconds for found identities
  private nullCacheTtlMs: number = 5000; // 5 seconds for not-found results

  constructor(identityService: IdentityService) {
    this.identityService = identityService;
  }

  /**
   * Resolve an identity anchor to a SigilIdentity.
   * Returns null if not found.
   * Measures latency and warns if >200ms.
   */
  async resolve(identityAnchor: string): Promise<SigilIdentity | null> {
    const startTime = Date.now();

    // Check cache first (use shorter TTL for null entries)
    const cached = this.cache.get(identityAnchor);
    if (cached) {
      const ttl = cached.identity === null ? this.nullCacheTtlMs : this.cacheTtlMs;
      if (Date.now() - cached.timestamp < ttl) {
        return cached.identity;
      }
    }

    // Cache miss — query the service
    const identity = await this.identityService.getIdentityById(identityAnchor);

    if (identity) {
      this.cache.set(identityAnchor, {
        identity,
        timestamp: Date.now(),
      });
    } else {
      // Cache negative results with shorter TTL to prevent repeated DB lookups
      this.cache.set(identityAnchor, {
        identity: null,
        timestamp: Date.now(),
      });
    }

    const latency = Date.now() - startTime;
    if (latency > 200) {
      console.warn(`[IdentityBinding] Lookup latency ${latency}ms exceeded 200ms threshold`);
    }

    return identity;
  }

  /**
   * Resolve an identity anchor, throwing if not found.
   */
  async resolveOrThrow(identityAnchor: string): Promise<SigilIdentity> {
    const identity = await this.resolve(identityAnchor);
    if (!identity) {
      throw new AetheriumError(
        ErrorCode.IDENTITY_NOT_FOUND,
        `Identity with anchor '${identityAnchor}' not found`,
      );
    }
    return identity;
  }

  /**
   * Clear the cache. Used for testing.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size for diagnostics.
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}
