import { registerProviders } from "./providers";
import { ProviderRegistry } from "../services/provider-registry";

jest.mock("../adapters/gemini-provider", () => ({
  GeminiProvider: jest.fn().mockImplementation(() => ({
    name: "gemini",
    capabilities: { supportsEmbeddings: true, supportsToolUse: true, supportsStreaming: false, maxTokens: 8192 },
    healthCheck: jest.fn().mockResolvedValue({ ok: true }),
  })),
}));

jest.mock("../adapters/ollama-provider", () => ({
  OllamaProvider: jest.fn().mockImplementation(() => ({
    name: "ollama",
    capabilities: { supportsEmbeddings: true, supportsToolUse: false, supportsStreaming: false, maxTokens: 4096 },
    healthCheck: jest.fn().mockResolvedValue({ ok: true }),
  })),
}));

jest.mock("../adapters/mock-provider", () => ({
  MockProvider: jest.fn().mockImplementation(() => ({
    name: "mock",
    capabilities: { supportsEmbeddings: true, supportsToolUse: false, supportsStreaming: false, maxTokens: 512 },
    healthCheck: jest.fn().mockResolvedValue({ ok: true }),
  })),
}));

describe("registerProviders", () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = ProviderRegistry.instance;
    registry.reset();
  });

  it("should register providers in correct priority order", async () => {
    await registerProviders();

    const providers = registry.listProviders();
    expect(providers).toHaveLength(3);
    expect(providers[0].name).toBe("gemini");
    expect(providers[0].priority).toBe(0);
    expect(providers[1].name).toBe("ollama");
    expect(providers[1].priority).toBe(1);
    expect(providers[2].name).toBe("mock");
    expect(providers[2].priority).toBe(2);
  });

  it("should return gemini and ollama providers", async () => {
    const result = await registerProviders();
    expect(result.geminiProvider).toBeDefined();
    expect(result.ollamaProvider).toBeDefined();
  });
});
