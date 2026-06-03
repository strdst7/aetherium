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
};

export interface AIProvider {
  name: string;
  capabilities: {
    supportsStreaming: boolean;
    supportsEmbeddings: boolean;
    maxTokens?: number;
  };
  generate(req: GenerateRequest): Promise<GenerateResponse>;
  embed?(input: string | string[]): Promise<{ embeddings: number[] | number[][] }>;
  healthCheck?(): Promise<{ ok: boolean; info?: any }>;
}
