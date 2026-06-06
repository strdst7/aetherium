import { AIProvider, GenerateRequest, GenerateResponse } from "./ai-adapter";

let FORCE_FAIL = false;

export function setMockForceFail(v: boolean) {
  FORCE_FAIL = v;
}

/**
 * Mock provider for testing without Ollama
 * Generates simple responses based on query keywords
 */
export class MockProvider implements AIProvider {
  name = "mock";
  capabilities = {
    supportsStreaming: false,
    supportsEmbeddings: true,
    supportsToolUse: false,
    maxTokens: 512,
  };

  private forceFail = false;

  setForceFail(v: boolean): void {
    this.forceFail = v;
  }

  private mockResponses: Record<string, string> = {
    halo: "The Halo Array is a superweapon built by the Forerunners to contain and destroy all sentient life in the galaxy. It represents an ultimate defense mechanism against the Flood parasite. The rings are distributed across the galaxy and can be activated in unison to sterilize all life.",
    flood: "The Flood is a parasitic species capable of assimilating organic matter and integrating their knowledge. It spreads rapidly and poses an existential threat to all galactic civilizations. Containment and eradication are the only known solutions.",
    chief:
      "Master Chief John-117 is humanity's greatest soldier and the last SPARTAN-II warrior. He has been instrumental in preventing Halo activation multiple times and containing Flood threats. His combat prowess and tactical intelligence make him humanity's most valuable asset.",
    arbiter:
      "The Arbiter is a Sangheili warrior who has evolved from military opponent to valued ally. He represents a new era of inter-species cooperation against existential threats. His understanding of ancient Forerunner technology has proven invaluable.",
  };

  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    if (FORCE_FAIL || this.forceFail) {
      throw new Error("Simulated mock provider failure");
    }

    const { messages = [], maxTokens = 512 } = req;

    // Extract query from messages
    let query = "";
    if (messages.length > 0) {
      query = messages[messages.length - 1].content || "";
    }

    // Find relevant mock response
    let text = this.getRelevantResponse(query);

    // Limit to maxTokens (roughly 4 chars per token)
    if (text.length > maxTokens * 4) {
      text = text.substring(0, maxTokens * 4) + "...";
    }

    return {
      id: `mock-${Date.now()}`,
      text,
      usage: {
        promptTokens: Math.ceil(query.length / 4),
        completionTokens: Math.ceil(text.length / 4),
        totalTokens: Math.ceil((query.length + text.length) / 4),
      },
    };
  }

  async embed(input: string | string[]): Promise<{ embeddings: number[] | number[][] }> {
    if (FORCE_FAIL || this.forceFail) {
      throw new Error("Simulated mock embedding failure");
    }

    const inputs = Array.isArray(input) ? input : [input];
    const embeddings = inputs.map((text) => this.localEmbedding(text));

    return {
      embeddings: Array.isArray(input) ? embeddings : embeddings[0],
    };
  }

  async healthCheck(): Promise<{ ok: boolean; info?: any }> {
    if (FORCE_FAIL || this.forceFail) {
      return { ok: false, info: "Forced mock failure" };
    }
    return {
      ok: true,
      info: { provider: "mock", status: "healthy" },
    };
  }

  private getRelevantResponse(query: string): string {
    const lower = query.toLowerCase();

    if (lower.includes("flood")) {
      return this.mockResponses.flood;
    }
    if (lower.includes("chief") || lower.includes("master")) {
      return this.mockResponses.chief;
    }
    if (lower.includes("arbiter") || lower.includes("sangheili")) {
      return this.mockResponses.arbiter;
    }
    if (lower.includes("halo")) {
      return this.mockResponses.halo;
    }

    // Default to fallback response
    return "Fallback provider response (identity preserved).";
  }

  private localEmbedding(text: string): number[] {
    const hash = text.split("").reduce((h, c) => h + c.charCodeAt(0), 0) % 1000;
    return Array.from({ length: 128 }, (_, i) => (hash + i) / 1000);
  }
}
