import { GeminiProvider } from "./gemini-provider";
import { ToolDefinition } from "./ai-adapter";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe("GeminiProvider", () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new GeminiProvider("test-api-key", "gemini-1.5-pro");
  });

  describe("constructor", () => {
    it("should use provided apiKey and model", () => {
      const p = new GeminiProvider("my-key", "gemini-1.5-flash");
      expect(p.name).toBe("gemini");
      expect(p.capabilities.supportsToolUse).toBe(true);
      expect(p.capabilities.supportsEmbeddings).toBe(true);
      expect(p.capabilities.maxTokens).toBe(8192);
    });

    it("should default to env vars when not provided", () => {
      process.env.GEMINI_API_KEY = "env-key";
      process.env.GEMINI_MODEL = "gemini-1.5-pro";
      const p = new GeminiProvider();
      expect(p.name).toBe("gemini");
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_MODEL;
    });
  });

  describe("generate", () => {
    it("should throw when API key is missing", async () => {
      const p = new GeminiProvider("");
      await expect(p.generate({ model: "gemini-1.5-pro", prompt: "hello" })).rejects.toThrow("GEMINI_API_KEY is not set");
    });

    it("should generate text from a prompt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Hello world" }] } }],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
        }),
      });

      const result = await provider.generate({ model: "gemini-1.5-pro", prompt: "hello" });

      expect(result.text).toBe("Hello world");
      expect(result.id).toMatch(/^gemini-/);
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });
    });

    it("should generate text from messages", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Response" }] } }],
          usageMetadata: {},
        }),
      });

      const result = await provider.generate({
        model: "gemini-1.5-pro",
        messages: [{ role: "user", content: "hello" }],
      });

      expect(result.text).toBe("Response");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad request",
      });

      await expect(provider.generate({ model: "gemini-1.5-pro", prompt: "hello" })).rejects.toThrow("Gemini API error: 400 Bad request");
    });
  });

  describe("generateWithTools", () => {
    it("should throw when API key is missing", async () => {
      const p = new GeminiProvider("");
      const tools: ToolDefinition[] = [{ name: "echo", description: "Echo input" }];
      await expect(p.generateWithTools({ model: "gemini-1.5-pro", prompt: "hello" }, tools)).rejects.toThrow("GEMINI_API_KEY is not set");
    });

    it("should return toolCalls when function calls are present", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [
                { text: "Let me call a tool" },
                { functionCall: { name: "echo", args: { message: "hello" } } },
              ],
            },
          }],
          usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10, totalTokenCount: 30 },
        }),
      });

      const tools: ToolDefinition[] = [{ name: "echo", description: "Echo input", parameters: { type: "object", properties: { message: { type: "string" } } } }];
      const result = await provider.generateWithTools({ model: "gemini-1.5-pro", prompt: "call echo" }, tools);

      expect(result.text).toBe("Let me call a tool");
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls![0].name).toBe("echo");
      expect(result.toolCalls![0].arguments).toEqual({ message: "hello" });
    });

    it("should return no toolCalls when no function calls are present", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "No tools needed" }] } }],
          usageMetadata: {},
        }),
      });

      const tools: ToolDefinition[] = [{ name: "echo", description: "Echo input" }];
      const result = await provider.generateWithTools({ model: "gemini-1.5-pro", prompt: "hello" }, tools);

      expect(result.text).toBe("No tools needed");
      expect(result.toolCalls).toBeUndefined();
    });
  });

  describe("embed", () => {
    it("should throw when API key is missing", async () => {
      const p = new GeminiProvider("");
      await expect(p.embed("hello")).rejects.toThrow("GEMINI_API_KEY is not set");
    });

    it("should return embeddings for a single string", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          embedding: { values: [0.1, 0.2, 0.3] },
        }),
      });

      const result = await provider.embed("hello");
      expect(result.embeddings).toEqual([0.1, 0.2, 0.3]);
    });

    it("should return embeddings for multiple strings", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: { values: [0.1, 0.2] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: { values: [0.3, 0.4] } }),
        });

      const result = await provider.embed(["hello", "world"]);
      expect(result.embeddings).toEqual([[0.1, 0.2], [0.3, 0.4]]);
    });
  });

  describe("healthCheck", () => {
    it("should return ok: false when API key is missing", async () => {
      const p = new GeminiProvider("");
      const result = await p.healthCheck();
      expect(result.ok).toBe(false);
      expect(result.info).toBe("GEMINI_API_KEY not set");
    });

    it("should return ok: true when API is reachable", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: "models/gemini-1.5-pro" }),
      });

      const result = await provider.healthCheck();
      expect(result.ok).toBe(true);
      expect(result.info).toEqual({
        model: "models/gemini-1.5-pro",
        provider: "gemini",
        status: "healthy",
      });
    });

    it("should return ok: false when API is unreachable", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const result = await provider.healthCheck();
      expect(result.ok).toBe(false);
      expect(result.info).toBe("Gemini API returned 403");
    });
  });
});
