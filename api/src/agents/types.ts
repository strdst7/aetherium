export type AgentContext = {
  identityAnchor: string;
  memories: any[];
  trace?: any;
};

export interface AgentResponse {
  output: string;
  meta?: any;
}

export interface Agent {
  name: string;
  role: string;
  act(input: string, ctx: AgentContext): Promise<AgentResponse>;
}
