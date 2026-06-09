import { MemoryService } from './memory-service';
import { ReflectiveService } from './reflective-service';
import { IdentityBindingService } from './identity-binding';
import { SovereignHaloService } from './sovereign-halo';
import { SigilIdentity } from '../types/identity';
import { ValidationReport } from '../types/halo';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AgentContext {
  identityAnchor: string;
  memories?: any[];
}

export interface AgentResult {
  output: string;
  meta?: any;
  validationReport?: ValidationReport;
}

// ============================================================================
// Council Agents (Stubs for Architecture)
// ============================================================================

/**
 * Archivist Agent
 * Responsible for retrieving identity-scoped memories and summarizing context.
 */
export class Archivist {
  async act(input: string, ctx: AgentContext): Promise<AgentResult> {
    return { 
      output: `Archivist context for: ${input}`, 
      meta: { results: ctx.memories || [] } 
    };
  }
}

/**
 * SigilKeeper Agent
 * Responsible for enforcing Sigil law and identity fidelity on the context.
 */
export class SigilKeeper {
  async act(input: string, ctx: AgentContext): Promise<AgentResult> {
    return { 
      output: `SigilKeeper review for: ${input}`,
      meta: { violations: [] }
    };
  }
}

/**
 * Narrator Agent
 * Responsible for synthesizing the final user-facing answer.
 */
export class Narrator {
  async act(input: string, ctx: AgentContext): Promise<AgentResult> {
    return { 
      output: `Narrator synthesis for: ${input}` 
    };
  }
}

// ============================================================================
// MultiAgentOrchestrator Implementation
// ============================================================================

/**
 * MultiAgentOrchestrator
 * 
 * Coordinates the multi-agent council (Archivist -> SigilKeeper -> Narrator).
 * Integrates with SovereignHaloService to validate each agent's output individually,
 * triggering regeneration if an agent violates identity constraints.
 */
export class MultiAgentOrchestrator {
  public archivist = new Archivist();
  public sigilKeeper = new SigilKeeper();
  public narrator = new Narrator();

  constructor(
    private memoryService: MemoryService,
    private reflectiveService: ReflectiveService,
    public identityBinding?: IdentityBindingService,
    private sovereignHalo?: SovereignHaloService
  ) {}

  /**
   * Validates an individual agent's output using Sovereign Halo.
   * If validation fails, attempts a single regeneration with tightened constraints.
   * 
   * @param output The original output from the agent
   * @param identity The resolved SigilIdentity
   * @param agentName The name of the agent (for logging)
   * @param agent The agent instance (for regeneration)
   * @param originalInput The original input provided to the agent
   * @param ctx The agent context
   * @returns Validation result, report, and optionally regenerated output
   */
  private async validateAgentOutput(
    output: string,
    identity: SigilIdentity | null,
    agentName: string,
    agent: any,
    originalInput: string,
    ctx: AgentContext
  ): Promise<{ valid: boolean; report?: ValidationReport; regeneratedOutput?: string }> {
    // Backward compatibility: skip validation if Halo or Identity is missing
    if (!this.sovereignHalo || !identity) {
      return { valid: true };
    }

    // 1. Initial Validation
    const report = await this.sovereignHalo.validate(output, identity, 1);
    console.log(`[Sovereign Halo] ${agentName} validation: ${report.status} (confidence: ${report.confidenceScore})`);

    if (report.status === 'passed') {
      return { valid: true, report };
    }

    // 2. Regeneration Attempt (Council agents get 1 attempt)
    const violations = report.checks.filter(c => !c.passed).map(c => c.detail);
    const tightenedPrompt = `${originalInput}\n\n[Constraints: ${violations.join('; ')}]`;
    
    console.log(`[Sovereign Halo] ${agentName} regenerating output due to violations...`);
    const regenResult = await agent.act(tightenedPrompt, ctx);
    
    // 3. Validate Regenerated Output
    const newReport = await this.sovereignHalo.validate(regenResult.output, identity, 2);
    console.log(`[Sovereign Halo] ${agentName} regeneration validation: ${newReport.status} (confidence: ${newReport.confidenceScore})`);

    if (newReport.status === 'passed') {
      return { valid: true, report: newReport, regeneratedOutput: regenResult.output };
    }

    // 4. Return failed state if regeneration also fails
    return { valid: false, report: newReport };
  }

  /**
   * Runs the full multi-agent council flow.
   * 
   * @param input The user query
   * @param identityAnchor The identity anchor string
   * @returns The results from all agents and the resolved identity
   */
  async runFlow(input: string, identityAnchor: string): Promise<{
    archivist: AgentResult;
    sigilKeeper: AgentResult;
    narrator: AgentResult;
    identity?: { id: string; name: string; version: number; };
  }> {
    // Resolve Identity
    const identity = this.identityBinding ? await this.identityBinding.resolveOrThrow(identityAnchor) : null;
    const baseCtx: AgentContext = { identityAnchor };

    // ==========================================
    // Step 1: Archivist
    // ==========================================
    const arch = await this.archivist.act(input, baseCtx);
    const archValidation = await this.validateAgentOutput(arch.output, identity, "Archivist", this.archivist, input, baseCtx);
    const archivistResult = archValidation.regeneratedOutput || arch.output;
    const archFinal: AgentResult = { ...arch, output: archivistResult, validationReport: archValidation.report };

    // Extract memories for downstream context
    const memories = arch.meta?.results ?? [];
    const ctxWithMem: AgentContext = { ...baseCtx, memories };

    // ==========================================
    // Step 2: Sigil Keeper
    // ==========================================
    const keeper = await this.sigilKeeper.act(input, ctxWithMem);
    const keeperValidation = await this.validateAgentOutput(keeper.output, identity, "SigilKeeper", this.sigilKeeper, input, ctxWithMem);
    const keeperResult = keeperValidation.regeneratedOutput || keeper.output;
    const keeperFinal: AgentResult = { ...keeper, output: keeperResult, validationReport: keeperValidation.report };

    // Determine final prompt based on Sigil Keeper's review
    const finalPrompt = keeperResult === "REVISE" || keeper.output === "REVISE"
      ? `${input}\n\n(Respect these constraints: ${JSON.stringify(keeper.meta?.violations || keeperValidation.report?.checks.filter(c => !c.passed).map(c => c.detail))})`
      : input;

    // ==========================================
    // Step 3: Narrator
    // ==========================================
    const final = await this.narrator.act(finalPrompt, ctxWithMem);
    const narratorValidation = await this.validateAgentOutput(final.output, identity, "Narrator", this.narrator, finalPrompt, ctxWithMem);
    const narratorResult = narratorValidation.regeneratedOutput || final.output;
    const narratorFinal: AgentResult = { ...final, output: narratorResult, validationReport: narratorValidation.report };

    // ==========================================
    // Return Council Results
    // ==========================================
    return {
      archivist: archFinal,
      sigilKeeper: keeperFinal,
      narrator: narratorFinal,
      identity: identity ? { id: identity.id, name: identity.name, version: 1 } : undefined,
    };
  }
}
