import { Agent, AgentContext, AgentResponse } from "./types";
import { ReflectiveService } from "../services/reflective-service";

export class SigilKeeper implements Agent {
  name = "SigilKeeper";
  role = "Enforces Sigil law and identity fidelity.";
  private reflectiveService: ReflectiveService;

  constructor(reflectiveService: ReflectiveService) {
    this.reflectiveService = reflectiveService;
  }

  async act(input: string, ctx: AgentContext): Promise<AgentResponse> {
    const fakeCandidate = { text: input };
    const evalResult = this.reflectiveService.evaluate(fakeCandidate, ctx.memories);
    if (evalResult.status === "approved") {
      return { output: "APPROVED", meta: evalResult };
    }
    return { output: "REVISE", meta: evalResult };
  }
}
