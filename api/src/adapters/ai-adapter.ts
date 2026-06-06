export type GenerateRequest = {
  model: string;
  prompt?: string;
  messages?: any[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  metadata?: any;
};

export type GenerateResponse = {
  id: string;
  text?: string;
  choices?: any[];
  usage?: any;
  reasoningTrace?: any;
  toolCalls?: ToolCall[];
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters?: Record<string, any>;
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, any>;
};

export interface AIProvider {
  name: string;
  capabilities: {
    supportsStreaming: boolean;
    supportsEmbeddings: boolean;
    supportsToolUse: boolean;
    maxTokens?: number;
  };
  generate(req: GenerateRequest): Promise<GenerateResponse>;
  generateWithTools?(req: GenerateRequest, tools: ToolDefinition[]): Promise<GenerateResponse>;
  embed?(input: string | string[]): Promise<{ embeddings: number[] | number[][] }>;
  healthCheck?(): Promise<{ ok: boolean; info?: any }>;
}
