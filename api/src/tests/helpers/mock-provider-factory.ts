import {
  AIProvider,
  GenerateRequest,
  GenerateResponse,
} from "../../adapters/ai-adapter";
import { SigilIdentity } from "../../types/identity";

export interface MockProviderOptions {
  deterministic?: boolean;
  responseText?: string;
  embedResult?: number[];
}

/**
 * Configurable mock LLM provider for tests.
 *
 * Supports deterministic and randomized response modes,
 * plus fixed or hash-based embeddings.
 */
export class MockProviderFactory implements AIProvider {
  name = "mock-factory";
  capabilities = {
    supportsStreaming: false,
    supportsEmbeddings: true,
    supportsToolUse: false,
    maxTokens: 512,
  };

  private options: Required<MockProviderOptions>;

  constructor(options: MockProviderOptions = {}) {
    this.options = {
      deterministic: true,
      responseText: "Mock generated response",
      embedResult: Array.from({ length: 384 }, () => 0.1),
      ...options,
    };
  }

  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    const query = this.extractQuery(req);
    let text: string;

    if (this.options.deterministic) {
      text = this.options.responseText;
    } else {
      text = `Random mock response [seed:${query.length}:${Date.now()}]`;
    }

    return {
      id: `mock-factory-${Date.now()}`,
      text,
      usage: {
        promptTokens: Math.ceil(query.length / 4),
        completionTokens: Math.ceil(text.length / 4),
        totalTokens: Math.ceil((query.length + text.length) / 4),
      },
    };
  }

  async embed(
    input: string | string[]
  ): Promise<{ embeddings: number[] | number[][] }> {
    const inputs = Array.isArray(input) ? input : [input];
    const embeddings = inputs.map(
      () => this.options.embedResult
    );

    return {
      embeddings: Array.isArray(input)
        ? (embeddings as number[][])
        : (embeddings[0] as number[]),
    };
  }

  async healthCheck(): Promise<{ ok: boolean; info?: any }> {
    return {
      ok: true,
      info: {
        provider: this.name,
        deterministic: this.options.deterministic,
      },
    };
  }

  private extractQuery(req: GenerateRequest): string {
    const messages = (req.messages || []) as Array<{ content?: string }>;
    if (messages.length > 0) {
      return messages[messages.length - 1].content || "";
    }
    return req.prompt || "";
  }
}

/**
 * Create a deterministic mock provider that always returns the given text.
 */
export function createDeterministicProvider(
  responseText: string
): MockProviderFactory {
  return new MockProviderFactory({
    deterministic: true,
    responseText,
  });
}

/**
 * Create a mock provider that embeds the identity name in generated text.
 * Useful for identity consistency testing.
 */
export function createIdentityAwareProvider(
  identity: SigilIdentity
): MockProviderFactory {
  return new MockProviderFactory({
    deterministic: true,
    responseText: `Mock generated response for identity [${identity.name}]`,
  });
}
