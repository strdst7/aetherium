import { ProviderRegistryInstance } from "../services/provider-registry";
import { OllamaProvider } from "../adapters/ollama-provider";
import { MockProvider } from "../adapters/mock-provider";
import { GeminiProvider } from "../adapters/gemini-provider";

export async function registerProviders() {
  // Initialize registry
  const registry = ProviderRegistryInstance;

  // Cloud provider (priority 0) — highest priority
  const geminiProvider = new GeminiProvider();
  registry.register(
    geminiProvider,
    0,
    ["cloud", "tool-use", "embeddings"]
  );

  // Primary provider (priority 1)
  const ollamaProvider = new OllamaProvider();
  registry.register(
    ollamaProvider,
    1,
    ["local", "embeddings"]
  );

  // Fallback provider (priority 2)
  registry.register(
    new MockProvider(),
    2,
    ["fallback", "embeddings"]
  );

  return { geminiProvider, ollamaProvider };
}
