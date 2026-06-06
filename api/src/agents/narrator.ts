import { Agent, AgentContext, AgentResponse } from "./types";
import { ProviderRegistryInstance } from "../services/provider-registry";

export class Narrator implements Agent {
  name = "Narrator";
  role = "Produces final user‑facing answer under Sigil law.";

  async act(input: string, ctx: AgentContext): Promise<AgentResponse> {
    const provider = await ProviderRegistryInstance.pick();
    const prompt = `
System: You are the Narrator of Aetherium. Respect Sigil law and prior agent outputs.
Context: ${JSON.stringify(ctx)}
User: ${input}
    `;
    const res = await provider.generate({ model: "demo", prompt });
    return { output: res.text ?? "", meta: res };
  }
}
