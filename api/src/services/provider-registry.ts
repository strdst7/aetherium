import { AIProvider } from "../adapters/ai-adapter";

export interface ProviderConfig {
  provider: AIProvider;
  priority: number;
  tags: string[];
}

export type SelectionPolicy = "highest-priority" | "random" | "balanced" | string;

export class ProviderRegistry {
  private providers: Map<string, ProviderConfig> = new Map();

  register(name: string, provider: AIProvider, priority: number = 0, tags: string[] = []): void {
    this.providers.set(name, { provider, priority, tags });
  }

  unregister(name: string): void {
    this.providers.delete(name);
  }

  pick(policy: SelectionPolicy = "highest-priority"): AIProvider {
    if (this.providers.size === 0) {
      throw new Error("No providers registered");
    }

    const configs = Array.from(this.providers.values());

    if (policy === "highest-priority") {
      return configs.sort((a, b) => b.priority - a.priority)[0].provider;
    }

    if (policy === "random") {
      return configs[Math.floor(Math.random() * configs.length)].provider;
    }

    if (policy === "balanced") {
      return configs[Math.floor(Math.random() * configs.length)].provider;
    }

    // Default to highest priority if unknown policy
    return configs.sort((a, b) => b.priority - a.priority)[0].provider;
  }

  pickByName(name: string): AIProvider | undefined {
    return this.providers.get(name)?.provider;
  }

  pickByTag(tag: string): AIProvider | undefined {
    const candidates = Array.from(this.providers.values()).filter((c) =>
      c.tags.includes(tag)
    );
    if (candidates.length === 0) return undefined;
    return candidates.sort((a, b) => b.priority - a.priority)[0].provider;
  }

  list(): Array<{ name: string; provider: string; priority: number; tags: string[] }> {
    return Array.from(this.providers.entries()).map(([name, config]) => ({
      name,
      provider: config.provider.name,
      priority: config.priority,
      tags: config.tags,
    }));
  }
}
