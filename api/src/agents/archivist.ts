import { Agent, AgentContext, AgentResponse } from "./types";
import { MemoryService } from "../services/memory-service";

export class Archivist implements Agent {
  name = "Archivist";
  role = "Curates and summarizes identity‑anchored memories.";
  private memoryService: MemoryService;

  constructor(memoryService: MemoryService) {
    this.memoryService = memoryService;
  }

  async act(input: string, ctx: AgentContext): Promise<AgentResponse> {
    const embedding = await this.memoryService.embedQuery(input);
    const results = await this.memoryService.vectorSearch(embedding, 0.8, 8);
    const summary = `Found ${results.length} memories anchored to ${ctx.identityAnchor}.`;
    return { output: summary, meta: { results } };
  }
}
