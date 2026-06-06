import { Archivist } from "../agents/archivist";
import { SigilKeeper } from "../agents/sigil-keeper";
import { Narrator } from "../agents/narrator";
import { AgentContext } from "../agents/types";
import { MemoryService } from "./memory-service";
import { ReflectiveService } from "./reflective-service";

export class MultiAgentOrchestrator {
  private archivist: Archivist;
  private sigilKeeper: SigilKeeper;
  private narrator: Narrator;

  constructor(memoryService: MemoryService, reflectiveService: ReflectiveService) {
    this.archivist = new Archivist(memoryService);
    this.sigilKeeper = new SigilKeeper(reflectiveService);
    this.narrator = new Narrator();
  }

  async runFlow(input: string, identityAnchor: string) {
    const baseCtx: AgentContext = { identityAnchor, memories: [] };

    // 1. Archivist: gather memories
    const arch = await this.archivist.act(input, baseCtx);
    const memories = arch.meta?.results ?? [];

    const ctxWithMem = { ...baseCtx, memories };

    // 2. Sigil Keeper: check intent
    const keeper = await this.sigilKeeper.act(input, ctxWithMem);

    // 3. If revision requested, tighten instruction
    const finalPrompt =
      keeper.output === "REVISE"
        ? `${input}\n\n(Respect these constraints: ${JSON.stringify(keeper.meta?.violations)})`
        : input;

    // 4. Narrator: final answer
    const final = await this.narrator.act(finalPrompt, ctxWithMem);

    return {
      archivist: arch,
      sigilKeeper: keeper,
      narrator: final
    };
  }
}
