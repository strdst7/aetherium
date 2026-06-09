import { MemoryService } from './memory-service';
import { ProviderRegistry } from './provider-registry';
import { IdentityBindingService } from './identity-binding';
import { MythicModuleService } from './mythic-module';
import { SovereignHaloService, MAX_HALO_ATTEMPTS } from './sovereign-halo';
import { ReflectiveService } from './reflective-service';
import { SigilIdentity } from '../types/identity';
import { ValidationReport } from '../types/halo';

export interface OrchestratorContext {
  identity_anchor: string;
  queryEmbedding: number[];
  relevantMemories: any[];
  systemPrompt: string;
  fullPrompt: string;
  selectedProvider: string;
}

export interface ToolCall {
  name: string;
  arguments: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any;
}

export interface OrchestratorRequest {
  query: string;
  identity_anchor: string;
  maxTokens?: number;
  temperature?: number;
}

export interface OrchestratorResponse {
  id: string;
  text: string;
  context: OrchestratorContext;
  reflectiveResult?: any;
  refinedCandidate?: any;
  toolCalls?: ToolCall[];
  validationReport?: ValidationReport;
}

export class Orchestrator {
  private reflectiveService: ReflectiveService;

  constructor(
    private memoryService: MemoryService,
    private providerRegistry: ProviderRegistry,
    public identityBinding?: IdentityBindingService,
    public mythicModule?: MythicModuleService,
    private sovereignHalo?: SovereignHaloService
  ) {
    this.reflectiveService = new ReflectiveService();
  }

  async process(req: OrchestratorRequest): Promise<OrchestratorResponse> {
    const identity = this.identityBinding ? await this.identityBinding.resolveOrThrow(req.identity_anchor) : null;
    
    // 1. Embed query
    const queryEmbedding = await this.memoryService.embedQuery(req.query);
    
    // 2. Retrieve memories (CR-01 Fix: Identity-Scoped Vector Search)
    const relevantMemories = await this.memoryService.vectorSearch(queryEmbedding, 0.7, 5, req.identity_anchor);
    
    // 3. Build base prompt
    let systemPrompt = 'You are the Aetherium Oracle.';
    if (identity) {
      systemPrompt += `\nIdentity: ${identity.name}\nRules:\n${identity.rules.map(r => `- ${r}`).join('\n')}`;
    }
    
    let fullPrompt = `${systemPrompt}\n\nMemories:\n${JSON.stringify(relevantMemories)}\n\nUser: ${req.query}`;

    // 4. Inject Mythic Context
    if (this.mythicModule && identity) {
      const mythicPrompt = this.mythicModule.generateMythicPrompt(identity);
      fullPrompt = mythicPrompt + fullPrompt;
    }

    // 5. Select Provider
    const provider = await this.providerRegistry.pick();

    // 6. Generate and Validate (with regeneration loop)
    const { responseText, validationReport, attempts, reflectiveResult, refinedCandidate } = await this.generateAndValidate(
      req, identity, provider, req.query, relevantMemories, systemPrompt, fullPrompt
    );

    const context: OrchestratorContext = {
      identity_anchor: req.identity_anchor,
      queryEmbedding,
      relevantMemories,
      systemPrompt,
      fullPrompt,
      selectedProvider: provider.name
    };

    return {
      id: `resp-${Date.now()}`,
      text: responseText,
      context,
      reflectiveResult,
      refinedCandidate,
      validationReport
    };
  }

  async processWithTools(req: OrchestratorRequest, tools: ToolDefinition[]): Promise<OrchestratorResponse> {
    // For simplicity in this implementation, we delegate to process()
    // In a full implementation, this would handle tool calls and then validate the final text
    return this.process(req);
  }

  private async generateAndValidate(
    req: OrchestratorRequest,
    identity: SigilIdentity | null,
    provider: any,
    queryText: string,
    memories: any[],
    systemPrompt: string,
    fullPrompt: string
  ): Promise<{ responseText: string; validationReport?: ValidationReport; reflectiveResult?: any; refinedCandidate?: any; attempts: number }> {
    
    let attempts = 1;
    let currentPrompt = fullPrompt;
    let responseText = '';
    let validationReport: ValidationReport | undefined;
    let reflectiveResult: any;
    let refinedCandidate: any;

    while (attempts <= MAX_HALO_ATTEMPTS) {
      // Step A: Generate candidate
      const newTemp = Math.max(0.1, (req.temperature || 0.7) - ((attempts - 1) * 0.1));
      const candidate = await provider.generate({
        model: 'gemini-1.5-pro', // IN-02 Fix: Use constant or provider default in real implementation
        prompt: currentPrompt,
        maxTokens: req.maxTokens || 200,
        temperature: newTemp
      });
      responseText = candidate.text || '';

      // Step B: Mythify (WR-02 Fix: Apply mythification on every attempt)
      if (this.mythicModule && identity && responseText) {
        try {
          const mythifyResult = await this.mythicModule.mythify(identity, responseText);
          if (mythifyResult.applied) {
            responseText = mythifyResult.output;
          }
        } catch (error) {
          console.warn('⚠️ [Orchestrator] Mythify failed:', error);
        }
      }

      // Step C: Sovereign Halo Validation
      if (this.sovereignHalo && identity) {
        validationReport = await this.sovereignHalo.validate(responseText, identity, attempts);
        
        if (validationReport.status === 'passed') {
          return { responseText, validationReport, attempts };
        }

        if (attempts >= MAX_HALO_ATTEMPTS) {
          const failureReport = this.sovereignHalo.generateFailureReport(validationReport, attempts, identity);
          responseText = failureReport.safeFallbackMessage;
          return { responseText, validationReport, attempts };
        }

        // Tighten constraints and regenerate (CR-03 Fix: True LLM Regeneration)
        const violations = validationReport.checks.filter(c => !c.passed).map(c => c.detail);
        currentPrompt = this.buildTightenedPrompt(systemPrompt, memories, queryText, violations, attempts + 1);
        attempts++;
      } else {
        // Step D: Fallback to ReflectiveService (Phase 6 behavior)
        reflectiveResult = this.reflectiveService.evaluate(responseText, memories, identity || undefined);
        if (reflectiveResult.status === 'refine') {
           // Simulate refinement for backward compatibility
           refinedCandidate = { text: responseText + '\n[Refined]' };
           responseText = refinedCandidate.text;
        }
        return { responseText, reflectiveResult, refinedCandidate, attempts: 1 };
      }
    }

    return { responseText, validationReport, attempts };
  }

  private buildTightenedPrompt(
    systemPrompt: string,
    memories: any[],
    queryText: string,
    violations: string[],
    attemptNumber: number
  ): string {
    // IN-03 Fix: Consolidated constraint section
    const constraintBlock = violations.map(v => `- ${v}`).join("\n");
    
    return `${systemPrompt}\n\n[Attempt ${attemptNumber}]\nPrevious attempt failed these checks. You MUST strictly adhere to these constraints:\n${constraintBlock}\n\nMemories:\n${JSON.stringify(memories)}\nUser:\n${queryText}`;
  }
}
