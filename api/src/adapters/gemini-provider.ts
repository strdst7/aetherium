import { AIProvider, GenerateRequest, GenerateResponse, ToolDefinition } from "./ai-adapter";

/**
 * GeminiProvider connects to the Gemini API via Google AI Studio.
 * Implements standard generation and tool-use generation.
 */
export class GeminiProvider implements AIProvider {
  name = "gemini";
  capabilities = {
    supportsStreaming: false,
    supportsEmbeddings: true,
    supportsToolUse: true,
    maxTokens: 8192,
  };

  private apiKey: string;
  private model: string;

  constructor(
    apiKey: string = process.env.GEMINI_API_KEY || "",
    model: string = process.env.GEMINI_MODEL || "gemini-2.5-flash"
  ) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    const { prompt, messages, maxTokens = 512, temperature = 0.7 } = req;

    let content = prompt || "";
    if (messages && messages.length > 0) {
      content = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: content }] }],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${error}`);
      }

      const data = await response.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return {
        id: `gemini-${Date.now()}`,
        text,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      throw new Error(`Gemini generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateWithTools(req: GenerateRequest, tools: ToolDefinition[]): Promise<GenerateResponse> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    const { prompt, messages, maxTokens = 512, temperature = 0.7 } = req;

    let content = prompt || "";
    if (messages && messages.length > 0) {
      content = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
    }

    try {
      const functionDeclarations = tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || { type: "object", properties: {} },
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: content }] }],
            tools: [{ functionDeclarations }],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${error}`);
      }

      const data = await response.json() as any;
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Extract text and tool calls
      let text = "";
      const toolCalls: any[] = [];

      for (const part of parts) {
        if (part.text) {
          text += part.text;
        }
        if (part.functionCall) {
          toolCalls.push({
            id: `call-${Date.now()}-${toolCalls.length}`,
            name: part.functionCall.name,
            arguments: part.functionCall.args || {},
          });
        }
      }

      return {
        id: `gemini-${Date.now()}`,
        text,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      throw new Error(`Gemini tool-use generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async embed(input: string | string[]): Promise<{ embeddings: number[] | number[][] }> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    const inputs = Array.isArray(input) ? input : [input];

    try {
      const embeddings = await Promise.all(
        inputs.map(async (text) => {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": this.apiKey,
              },
              body: JSON.stringify({
                content: { parts: [{ text }] },
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Gemini embedding error: ${response.status}`);
          }

          const data = await response.json() as any;
          return data.embedding?.values || [];
        })
      );

      return {
        embeddings: Array.isArray(input) ? embeddings : embeddings[0],
      };
    } catch (error) {
      throw new Error(`Gemini embedding failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async healthCheck(): Promise<{ ok: boolean; info?: any }> {
    if (!this.apiKey) {
      return { ok: false, info: "GEMINI_API_KEY not set" };
    }

    try {
      // Make a minimal API call to verify connectivity
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}`,
        {
          method: "GET",
          headers: { "x-goog-api-key": this.apiKey },
        }
      );

      if (response.ok) {
        const data = await response.json() as any;
        return {
          ok: true,
          info: { model: data.name, provider: "gemini", status: "healthy" },
        };
      }

      return { ok: false, info: `Gemini API returned ${response.status}` };
    } catch (error) {
      return { ok: false, info: error instanceof Error ? error.message : String(error) };
    }
  }
}
