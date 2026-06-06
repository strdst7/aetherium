import { AIProvider } from "../adapters/ai-adapter";

export type ProviderEntry = {
  provider: AIProvider;
  priority: number;
  tags?: string[];
};

export class ProviderRegistry {
  private static _instance: ProviderRegistry;
  private providers: ProviderEntry[] = [];

  private constructor() {}

  static get instance(): ProviderRegistry {
    if (!ProviderRegistry._instance) {
      ProviderRegistry._instance = new ProviderRegistry();
    }
    return ProviderRegistry._instance;
  }

  /**
   * Resets the registry (useful for tests).
   */
  reset() {
    this.providers = [];
  }

  /**
   * Register a provider with a priority.
   * Lower priority number = higher priority.
   */
  register(provider: AIProvider, priority = 10, tags: string[] = []) {
    this.providers.push({ provider, priority, tags });
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Returns the highest‑priority healthy provider.
   * If all providers fail health checks, throws an error.
   */
  async pick(policy: { requireEmbeddings?: boolean; preferLocal?: boolean; requireToolUse?: boolean } = {}) {
    let candidates = [...this.providers];

    // Filter by embedding capability
    if (policy.requireEmbeddings) {
      candidates = candidates.filter((p) => p.provider.capabilities.supportsEmbeddings);
    }

    // Filter by tool-use capability
    if (policy.requireToolUse) {
      candidates = candidates.filter((p) => p.provider.capabilities.supportsToolUse);
    }

    // Filter by local preference
    if (policy.preferLocal) {
      const local = candidates.filter((p) => p.tags?.includes("local"));
      if (local.length > 0) candidates = local;
    }

    // Health check loop
    for (const entry of candidates) {
      try {
        const health = await entry.provider.healthCheck?.();
        if (!health || health.ok !== false) {
          return entry.provider;
        }
      } catch {
        // Provider unhealthy, continue to next
      }
    }

    throw new Error("No healthy providers available");
  }

  /**
   * Returns the first registered provider (used for embeddings).
   */
  get defaultProvider(): AIProvider {
    if (this.providers.length === 0) {
      throw new Error("ProviderRegistry is empty — no providers have been registered");
    }
    return this.providers[0].provider;
  }

  listProviders() {
    return this.providers.map((p) => ({
      name: p.provider.name,
      priority: p.priority,
      tags: p.tags,
    }));
  }
}

export const ProviderRegistryInstance = ProviderRegistry.instance;
