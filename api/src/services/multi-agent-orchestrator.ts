import { Archivist } from "../agents/archivist";
import { SigilKeeper } from "../agents/sigil-keeper";
import { Narrator } from "../agents/narrator";
import { AgentContext } from "../agents/types";
import { MemoryService } from "./memory-service";
import { ProviderRegistryInstance } from "./provider-registry";
import { ReflectiveService } from "./reflective-service";
import { IdentityBindingService } from "./identity-binding";
import { SigilIdentity } from "../types/identity";
import { SovereignHaloService } from "./sovereign-halo";
import { ValidationReport } from "../types/halo";

export class MultiAgentOrchestrator {
  private archivist: Archivist;
  private sigilKeeper: SigilKeeper;
  private narrator: Narrator;
  private identityBinding?: IdentityBindingService;
  private sovereignHalo?: SovereignHaloService;

  constructor(
    memoryService: MemoryService,
    reflectiveService: ReflectiveService,
    identityBinding?: IdentityBindingService,
    sovereignHalo?: SovereignHaloService
  ) {
    this.archivist = new Archivist(memoryService);
    this.sigilKeeper = new SigilKeeper(reflectiveService);
    this.narrator = new Narrator();
    this.identityBinding = identityBinding;
    this.sovereignHalo = sovereignHalo;
  }

  async runFlow(input: string, identityAnchor: string) {
    // Load identity if available
    let identity: SigilIdentity | null = null;
    if (this.identityBinding) {
      identity = await this.identityBinding.resolve(identityAnchor);
    }

    const baseCtx: AgentContext = { identityAnchor, memories: [] };

    // 1. Archivist: gather memories (identity-scoped)
    const arch = await this.archivist.act(input, baseCtx);
    const memories = arch.meta?.results ?? [];

    const ctxWithMem = { ...baseCtx, memories };

    // 2. Sigil Keeper: check intent (with identity rules)
    const keeper = await this.sigilKeeper.act(input, ctxWithMem);

    // 3. If revision requested, tighten instruction
    const finalPrompt =
      keeper.output === "REVISE"
        ? `${input}\n\n(Respect these constraints: ${JSON.stringify(keeper.meta?.violations)})`
        : input;

    // 4. Narrator: final answer
    const final = await this.narrator.act(finalPrompt, ctxWithMem);

    // 5. Validate each agent's output through Sovereign Halo
    const archValidation = await this.validateAgentOutput(arch.output, identity, "Archivist");
    const keeperValidation = await this.validateAgentOutput(keeper.output, identity, "SigilKeeper");
    const narratorValidation = await this.validateAgentOutput(final.output, identity, "Narrator");

    const archivistResult = archValidation.regeneratedOutput || arch.output;
    const keeperResult = keeperValidation.regeneratedOutput || keeper.output;
    const narratorResult = narratorValidation.regeneratedOutput || final.output;

    return {
      archivist: { ...arch, output: archivistResult, validationReport: archValidation.report },
      sigilKeeper: { ...keeper, output: keeperResult, validationReport: keeperValidation.report },
      narrator: { ...final, output: narratorResult, validationReport: narratorValidation.report },
      identity: identity
        ? {
            id: identity.id,
            name: identity.name,
            version: identity.version,
          }
        : undefined,
    };
  }

  private async validateAgentOutput(
    output: string,
    identity: SigilIdentity | null,
    agentName: string
  ): Promise<{ valid: boolean; report?: ValidationReport; regeneratedOutput?: string }> {
    if (!this.sovereignHalo || !identity) {
      return { valid: true };
    }

    const report = await this.sovereignHalo.validate(output, identity);
    console.log(`[Sovereign Halo] ${agentName} validation: ${report.status} (confidence: ${report.confidenceScore})`);

    if (report.status === "passed") {
      return { valid: true, report };
    }

    // Council agents get 1 regeneration attempt
    const violations = report.checks.filter(c => !c.passed).map(c => c.detail);
    
    // Actually regenerate via LLM with tightened constraints (not just text concatenation)
    const tightenedPrompt = `System: You are Aetherium, the AI steward. Revise the following output to satisfy these constraints:

Constraints:
${violations.map(v => `- ${v}`).join("\n")}

Previous output:
${output}

Generate a corrected version that passes all constraints above. Do NOT include the constraint violations in your output.`;

    const provider = await ProviderRegistryInstance.pick();
    const candidate = await provider.generate({ prompt: tightenedPrompt, model: "demo" });
    const regeneratedOutput = candidate.text || output;
    
    const newReport = await this.sovereignHalo.validate(regeneratedOutput, identity);
    
    if (newReport.status === "passed") {
      return { valid: true, report: newReport, regeneratedOutput };
    }

    return { valid: false, report: newReport };
  }
}
