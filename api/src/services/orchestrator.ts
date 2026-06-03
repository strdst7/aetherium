import { AIProvider, GenerateRequest, GenerateResponse } from "../adapters/ai-adapter";
import { ProviderRegistry, SelectionPolicy } from "./provider-registry";
import { MemoryService, MemoryDocument, VectorSearchResult } from "./memory-service";

export interface OrchestratorRequest {
  identity_anchor: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  policy?: SelectionPolicy;
  memoryAlpha?: number;
  memoryK?: number;
}

export interface OrchestratorContext {
  identity_anchor: string;
  queryEmbedding: number[];
  relevantMemories: VectorSearchResult[];
  systemPrompt: string;
  fullPrompt: string;
  selectedProvider: string;
}

export interface OrchestratorResponse {
  id: string;
  text: string;
  usage?: any;
  context: OrchestratorContext;
  reasoningTrace?: any;
}

export class Orchestrator {
  private memoryService: MemoryService;
  private providerRegistry: ProviderRegistry;
  private systemPrompt: string;

  constructor(
    memoryService: MemoryService,
    providerRegistry: ProviderRegistry,
    systemPrompt?: string
  ) {
    this.memoryService = memoryService;
    this.providerRegistry = providerRegistry;
    this.systemPrompt =
      systemPrompt ||
      `You are an intelligent assistant with access to a knowledge base. 
Use the provided context memories to inform your response. 
Be concise, accurate, and grounded in the available information.`;
  }

  async process(req: OrchestratorRequest): Promise<OrchestratorResponse> {
    const {
      identity_anchor,
      messages,
      maxTokens = 512,
      temperature = 0.7,
      policy = "highest-priority",
      memoryAlpha = 0.5,
      memoryK = 5,
    } = req;

    // Step 1: Compute query embedding
    const queryEmbedding = await this.computeQueryEmbedding(messages);

    // Step 2: Search memory for relevant documents
    const relevantMemories = await this.memoryService.vectorSearch(
      queryEmbedding,
      memoryAlpha,
      memoryK
    );

    // Step 2b: Also fetch documents by sigil (identity anchor)
    if (identity_anchor) {
      const sigilMemories = await this.memoryService.searchByMetadata({ sigil: identity_anchor });
      for (const doc of sigilMemories) {
        if (!relevantMemories.some(m => m.doc.id === doc.id)) {
          relevantMemories.push({ doc, score: 1.0 }); // Full score for direct sigil match
        }
      }
    }

    // Step 3: Build prompt with context
    const { systemPrompt, fullPrompt } = this.buildPrompt(
      identity_anchor,
      relevantMemories,
      messages
    );

    // Step 4: Select provider
    const provider = this.providerRegistry.pick(policy);
    const providerName = provider.name;

    // Step 5: Generate candidate response
    const generateReq: GenerateRequest = {
      model: "default", // Will be overridden by provider
      messages: [
        { role: "system", content: systemPrompt },
        ...relevantMemories.map((m) => ({
          role: "assistant",
          content: `[Memory: ${m.doc.id}] ${(m.doc.content || (m.doc as any).note || "").substring(0, 200)}...`,
        })),
        ...messages,
      ],
      maxTokens,
      temperature,
    };

    let response: any;
    try {
      response = await provider.generate(generateReq);
    } catch (error) {
      // Fallback to mock provider if generation fails
      console.warn(`Generation failed with ${provider.name}, falling back to mock provider`);
      const mockProvider = this.providerRegistry.pickByName("mock");
      if (!mockProvider) {
        throw new Error("Generation failed and no fallback provider available");
      }
      response = await mockProvider.generate(generateReq);
    }

    // Step 6: Build context for reflective layer
    const context: OrchestratorContext = {
      identity_anchor,
      queryEmbedding,
      relevantMemories,
      systemPrompt,
      fullPrompt,
      selectedProvider: providerName,
    };

    // Step 7: Return response with context for reflective layer
    return {
      id: response.id,
      text: response.text || (response.choices?.[0]?.message?.content ?? ""),
      usage: response.usage,
      context,
      reasoningTrace: response.reasoningTrace,
    };
  }

  private async computeQueryEmbedding(
    messages: Array<{ role: string; content: string }>
  ): Promise<number[]> {
    // Combine all user messages into a single query
    const queryText = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");

    if (!queryText) {
      throw new Error("No user messages provided");
    }

    // Try to get embeddings from a provider that supports it
    const provider = this.providerRegistry.pickByTag("embeddings");

    if (provider && provider.embed) {
      const result = await provider.embed(queryText);
      return Array.isArray(result.embeddings[0])
        ? (result.embeddings[0] as number[])
        : (result.embeddings as number[]);
    }

    // Fallback: local embedding function
    return this.localEmbedding(queryText);
  }

  private localEmbedding(text: string): number[] {
    // Simple hash-based embedding for prototyping
    const hash = text.split("").reduce((h, c) => h + c.charCodeAt(0), 0) % 1000;
    return Array.from({ length: 128 }, (_, i) => (hash + i) / 1000);
  }

  private buildPrompt(
    identity_anchor: string,
    relevantMemories: VectorSearchResult[],
    messages: Array<{ role: string; content: string }>
  ): { systemPrompt: string; fullPrompt: string } {
    const systemPrompt = `${this.systemPrompt}

Identity Anchor: ${identity_anchor}

Relevant Context from Memory:
${relevantMemories
  .map(
    (m, i) =>
      `${i + 1}. [${m.doc.id} - Score: ${m.score.toFixed(2)}]\n${m.doc.content || (m.doc as any).note || JSON.stringify(m.doc)}`
  )
  .join("\n\n")}`;

    const userMessages = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const fullPrompt = `${systemPrompt}\n\n---\n\n${userMessages}`;

    return { systemPrompt, fullPrompt };
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }
}
