import { AIProvider, GenerateRequest, GenerateResponse } from "./ai-adapter";

let FORCE_FAIL = false;

export function setForceFail(v: boolean) {
  FORCE_FAIL = v;
}

export class OllamaProvider implements AIProvider {
  name = "ollama";
  capabilities = {
    supportsStreaming: false,
    supportsEmbeddings: true,
    supportsToolUse: false,
    maxTokens: 4096,
  };

  private baseUrl: string;
  private defaultModel: string;
  private forceFail = false;

  setForceFail(v: boolean): void {
    this.forceFail = v;
  }

  constructor(baseUrl: string = process.env.OLLAMA_URL || "http://localhost:11434") {
    this.baseUrl = baseUrl;
    this.defaultModel = process.env.OLLAMA_MODEL || "llama3";
  }

  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    if (FORCE_FAIL || this.forceFail) {
      throw new Error("Simulated Ollama provider failure");
    }

    const { prompt, messages, maxTokens = 512, temperature = 0.7 } = req;
    const model = this.defaultModel;

    let text = prompt || "";
    if (messages && messages.length > 0) {
      text = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: text,
          stream: false,
          temperature,
          num_predict: maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return {
        id: `ollama-${Date.now()}`,
        text: data.response || "",
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
      };
    } catch (error) {
      throw new Error(`Ollama generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async embed(input: string | string[]): Promise<{ embeddings: number[] | number[][] }> {
    if (FORCE_FAIL || this.forceFail) {
      throw new Error("Simulated Ollama embedding failure");
    }

    const inputs = Array.isArray(input) ? input : [input];

    try {
      // Try to use Ollama embeddings endpoint if available
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "nomic-embed-text",
          input: inputs,
        }),
      });

      if (response.ok) {
        const data = await response.json() as any;
        return {
          embeddings: Array.isArray(input) ? data.embeddings : data.embeddings[0],
        };
      }

      // Fallback to local embedding if Ollama embeddings fail
      console.warn("⚠️ Ollama embeddings unavailable, using local embedding");
      return {
        embeddings: Array.isArray(input)
          ? inputs.map((text) => this.localEmbedding(text))
          : this.localEmbedding(inputs[0]),
      };
    } catch (error) {
      console.warn("⚠️ Ollama embedding failed, using local embedding:", error instanceof Error ? error.message : String(error));
      // Fallback to local embedding
      return {
        embeddings: Array.isArray(input)
          ? inputs.map((text) => this.localEmbedding(text))
          : this.localEmbedding(inputs[0]),
      };
    }
  }

  private localEmbedding(text: string): number[] {
    // Simple hash-based embedding for fallback
    const hash = text.split("").reduce((h, c) => h + c.charCodeAt(0), 0) % 1000;
    return Array.from({ length: 128 }, (_, i) => (hash + i) / 1000);
  }

  async healthCheck(): Promise<{ ok: boolean; info?: any }> {
    if (FORCE_FAIL || this.forceFail) {
      return { ok: false, info: "Forced failure (simulated)" };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json() as any;
        return {
          ok: true,
          info: { models: data.models?.length || 0, baseUrl: this.baseUrl },
        };
      }
      return { ok: false };
    } catch (error) {
      console.warn('[OllamaProvider] Health check failed:', error instanceof Error ? error.message : String(error));
      return { ok: false };
    }
  }
}
