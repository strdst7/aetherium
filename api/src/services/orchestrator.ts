import { ProviderRegistry } from './provider-registry';
import { MemoryService, VectorSearchResult } from './memory-service';
import { ReflectiveService } from './reflective-service';
import { ToolDefinition, ToolCall } from '../adapters/ai-adapter';
import { TaskPlan, PlanStep } from '../controllers/reason';
import { IdentityBindingService } from './identity-binding';
import { SigilIdentity } from '../types/identity';
import { MythicModule } from './mythic-module';
import { SovereignHaloService } from './sovereign-halo';
import { ValidationReport } from '../types/halo';
import { AuditService } from './audit-service';
import { AuditRecordCreate, AuditProvenance } from '../types/audit';
import { CURRENT_API_VERSION } from '../types/api-contracts';

export interface OrchestratorContext {
  identity_anchor: string;
  queryEmbedding: number[];
  relevantMemories: VectorSearchResult[];
  systemPrompt: string;
  fullPrompt: string;
  selectedProvider: string;
  toolExecutionTrace?: any[];
  identity?: SigilIdentity;
}

export interface OrchestratorRequest {
  identity_anchor: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  policy?: { requireEmbeddings?: boolean; preferLocal?: boolean; requireToolUse?: boolean };
  memoryAlpha?: number;
  memoryK?: number;
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
  private memoryService: MemoryService;
  private providerRegistry: ProviderRegistry;
  private reflectiveService: ReflectiveService;
  private identityBinding?: IdentityBindingService;
  private mythicModule?: MythicModule;
  private sovereignHalo?: SovereignHaloService;
  private auditService?: AuditService;

  constructor(
    memoryService: MemoryService,
    providerRegistry: ProviderRegistry,
    identityBinding?: IdentityBindingService,
    mythicModule?: MythicModule,
    sovereignHalo?: SovereignHaloService,
    auditService?: AuditService
  ) {
    this.memoryService = memoryService;
    this.providerRegistry = providerRegistry;
    this.reflectiveService = new ReflectiveService();
    this.identityBinding = identityBinding;
    this.mythicModule = mythicModule;
    this.sovereignHalo = sovereignHalo;
    this.auditService = auditService;
  }

  async process(req: OrchestratorRequest): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    const { identity_anchor, messages, policy = {}, memoryAlpha = 0.5, memoryK = 5 } = req;
    const queryText = messages.map((m: any) => m.content).join(' ');

    // Load identity if binding service available
    let identity: SigilIdentity | null = null;
    if (this.identityBinding) {
      identity = await this.identityBinding.resolve(identity_anchor);
    }

    // Step 1: compute embedding
    const provider = await this.providerRegistry.pick({ ...policy, requireEmbeddings: true });
    let embedding: number[] = [0];
    if (provider.embed) {
      const embedResult = await provider.embed(queryText);
      embedding = Array.isArray(embedResult.embeddings[0]) 
        ? (embedResult.embeddings[0] as number[]) 
        : (embedResult.embeddings as number[]);
    }

    // Step 2: memory retrieval (identity-scoped)
    const memories = await this.memoryService.vectorSearch(embedding, memoryAlpha, memoryK, identity_anchor);

    // Step 3: build prompt with identity and mythic context
    let systemPrompt = 'System: You are Aetherium, preserve identity fidelity.';
    if (identity) {
      systemPrompt += `\nIdentity: ${identity.name}\nRules: ${identity.config?.customRules?.join(', ') || 'none'}`;
      
      // Add mythic context if available
      if (this.mythicModule) {
        try {
          const mythicContext = await this.mythicModule.generatePromptContext(identity);
          systemPrompt += `\n${mythicContext.fullContext}`;
        } catch (error) {
          console.warn('[Orchestrator] Failed to generate mythic context:', error);
        }
      }
    }

    const context: OrchestratorContext = {
      identity_anchor,
      queryEmbedding: embedding,
      relevantMemories: memories,
      systemPrompt,
      fullPrompt: `${systemPrompt}\nMemories:\n${JSON.stringify(memories)}\nUser:\n${queryText}`,
      selectedProvider: provider.name,
      identity: identity || undefined,
    };

    // Step 4: Generate and validate through Sovereign Halo
    const { responseText, validationReport } = await this.generateAndValidate(
      req,
      identity,
      provider,
      queryText,
      memories,
      systemPrompt
    );

    // Step 5: Reflective evaluation (only when Sovereign Halo is NOT active)
    let reflectiveResult;
    let refinedCandidate;
    if (!this.sovereignHalo || !identity) {
      reflectiveResult = this.reflectiveService.evaluate({ text: responseText }, memories, identity || undefined);
      
      // If refine, re-generate with constraints
      if (reflectiveResult.status === "refine") {
        const constraints = reflectiveResult.violations
          .map(v => `- ${v.message}`)
          .join("\n");

        const constrainedPrompt = `
System: You are Aetherium. Preserve identity fidelity.
Constraints:
${constraints}

Memories: ${JSON.stringify(memories)}
User: ${queryText}
        `;

        refinedCandidate = await provider.generate({
          model: "demo",
          prompt: constrainedPrompt,
          maxTokens: req.maxTokens || 200,
          temperature: req.temperature || 0.2
        });
      }
    }

    const response: OrchestratorResponse = {
      id: `res_${Date.now()}`,
      text: responseText,
      context,
      reflectiveResult,
      refinedCandidate,
      validationReport,
    };

    // Step 6: Save audit record (best-effort)
    await this.saveAuditRecord(req, response, identity, provider, startTime);

    return response;
  }

  async processWithTools(req: OrchestratorRequest, tools: ToolDefinition[]): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    const { identity_anchor, messages, policy = {}, memoryAlpha = 0.5, memoryK = 5 } = req;
    const queryText = messages.map((m: any) => m.content).join(' ');

    // Load identity if binding service available
    let identity: SigilIdentity | null = null;
    if (this.identityBinding) {
      identity = await this.identityBinding.resolve(identity_anchor);
    }

    // Step 1: compute embedding
    const provider = await this.providerRegistry.pick({ ...policy, requireEmbeddings: true, requireToolUse: true });
    let embedding: number[] = [0];
    if (provider.embed) {
      const embedResult = await provider.embed(queryText);
      embedding = Array.isArray(embedResult.embeddings[0]) 
        ? (embedResult.embeddings[0] as number[]) 
        : (embedResult.embeddings as number[]);
    }

    // Step 2: memory retrieval (identity-scoped)
    const memories = await this.memoryService.vectorSearch(embedding, memoryAlpha, memoryK, identity_anchor);

    // Step 3: build prompt with identity and mythic context
    let systemPrompt = 'System: You are Aetherium, preserve identity fidelity.';
    if (identity) {
      systemPrompt += `\nIdentity: ${identity.name}\nRules: ${identity.config?.customRules?.join(', ') || 'none'}`;
      
      // Add mythic context if available
      if (this.mythicModule) {
        try {
          const mythicContext = await this.mythicModule.generatePromptContext(identity);
          systemPrompt += `\n${mythicContext.fullContext}`;
        } catch (error) {
          console.warn('[Orchestrator] Failed to generate mythic context:', error);
        }
      }
    }

    const context: OrchestratorContext = {
      identity_anchor,
      queryEmbedding: embedding,
      relevantMemories: memories,
      systemPrompt,
      fullPrompt: `${systemPrompt}\nMemories:\n${JSON.stringify(memories)}\nUser:\n${queryText}`,
      selectedProvider: provider.name,
      identity: identity || undefined,
    };

    // Step 4: generate with tools
    if (!provider.generateWithTools) {
      throw new Error('Provider does not support tool use');
    }

    const candidate = await provider.generateWithTools({
      model: 'gemini-1.5-pro',
      prompt: context.fullPrompt,
      maxTokens: req.maxTokens,
      temperature: req.temperature
    }, tools);

    let responseText = candidate.text || '';
    
    // Step 4b: Mythify output if identity and mythic module available
    if (identity && this.mythicModule && responseText) {
      try {
        const mythifyResult = await this.mythicModule.mythify(identity, responseText);
        if (mythifyResult.applied) {
          responseText = mythifyResult.output;
        }
      } catch (error) {
        console.warn('[Orchestrator] Mythify failed:', error);
      }
    }

    // Step 5: Validate through Sovereign Halo
    let validationReport: ValidationReport | undefined;
    if (this.sovereignHalo && identity) {
      let attempts = 1;
      const maxAttempts = this.sovereignHalo['options']?.maxAttempts || 3;

      while (attempts <= maxAttempts) {
        const report = await this.sovereignHalo.validate(responseText, identity, attempts);
        
        if (report.status === 'passed') {
          validationReport = report;
          break;
        }

        if (attempts >= maxAttempts) {
          const failureReport = this.sovereignHalo.generateFailureReport(report, attempts, identity);
          responseText = failureReport.safeFallbackMessage;
          validationReport = report;
          break;
        }

        // Tighten constraints and regenerate
        const violations = report.checks.filter(c => !c.passed).map(c => c.detail);
        const tightenedPrompt = this.buildTightenedPrompt(systemPrompt, memories, queryText, violations, attempts);
        const newTemp = Math.max(0.1, (req.temperature || 0.7) - (attempts * 0.1));
        
        const refined = await provider.generateWithTools({
          model: 'gemini-1.5-pro',
          prompt: tightenedPrompt,
          maxTokens: req.maxTokens || 200,
          temperature: newTemp,
        }, tools);
        responseText = refined.text || '';
        attempts++;
      }
    }

    // Step 6: Reflective evaluation (only when Sovereign Halo is NOT active)
    let reflectiveResult;
    if (!this.sovereignHalo || !identity) {
      reflectiveResult = this.reflectiveService.evaluate({ text: responseText }, memories, identity || undefined);
    }

    const response: OrchestratorResponse = {
      id: candidate.id || `res_${Date.now()}`,
      text: responseText,
      context,
      reflectiveResult,
      toolCalls: candidate.toolCalls,
      validationReport,
    };

    // Step 7: Save audit record (best-effort)
    await this.saveAuditRecord(req, response, identity, provider, startTime);

    return response;
  }

  async generatePlan(req: OrchestratorRequest, tools: ToolDefinition[]): Promise<TaskPlan> {
    const { identity_anchor, messages } = req;
    const queryText = messages.map((m: any) => m.content).join(' ');

    const provider = await this.providerRegistry.pick({ requireToolUse: true });
    if (!provider.generateWithTools) {
      throw new Error('Provider does not support tool use');
    }

    const planPrompt = `You are a task planner. Given a user request and available tools, create a step-by-step plan to fulfill the request.

Available tools:
${JSON.stringify(tools.map(t => ({ name: t.name, description: t.description, parameters: t.parameters })), null, 2)}

User request: "${queryText}"

Respond with a JSON object in this exact format:
{
  "description": "Brief description of the plan",
  "estimatedSteps": <number>,
  "steps": [
    {
      "stepNumber": 1,
      "tool": "tool_name",
      "args": { "param1": "value1" },
      "expectedResult": "Description of expected result"
    }
  ]
}

Provide ONLY the JSON object, no markdown formatting, no additional text.`;

    const candidate = await provider.generateWithTools({
      model: 'gemini-1.5-pro',
      prompt: planPrompt,
      maxTokens: req.maxTokens || 1024,
      temperature: req.temperature || 0.2
    }, []);

    const responseText = candidate.text || '';
    let plan: TaskPlan;

    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonStr);
      
      if (!parsed.steps || !Array.isArray(parsed.steps)) {
        throw new Error('Invalid plan: missing steps array');
      }

      const steps: PlanStep[] = parsed.steps.map((s: any, index: number) => ({
        stepNumber: s.stepNumber || index + 1,
        tool: s.tool || s.name || '',
        args: s.args || s.arguments || {},
        expectedResult: s.expectedResult || s.description || '',
        status: 'pending',
        retryCount: 0
      }));

      plan = {
        steps,
        description: parsed.description || `Plan for: ${queryText}`,
        estimatedSteps: parsed.estimatedSteps || steps.length
      };
    } catch (error) {
      // Fallback: create a simple single-step plan
      plan = {
        steps: [{
          stepNumber: 1,
          tool: tools[0]?.name || 'unknown',
          args: { query: queryText },
          expectedResult: 'Execute query',
          status: 'pending',
          retryCount: 0
        }],
        description: `Fallback plan for: ${queryText}`,
        estimatedSteps: 1
      };
    }

    return plan;
  }

  /**
   * Generate output and validate through Sovereign Halo with bounded regeneration.
   */
  private async generateAndValidate(
    req: OrchestratorRequest,
    identity: SigilIdentity | null,
    provider: any,
    queryText: string,
    memories: any[],
    systemPrompt: string
  ): Promise<{ responseText: string; validationReport?: ValidationReport; attempts: number }> {
    // Generate initial candidate
    const prompt = `${systemPrompt}\nMemories:\n${JSON.stringify(memories)}\nUser:\n${queryText}`;
    let candidate = await provider.generate({
      model: 'demo',
      prompt,
      maxTokens: req.maxTokens,
      temperature: req.temperature
    });
    let responseText = candidate.text || '';

    // Mythify if available
    if (identity && this.mythicModule && responseText) {
      try {
        const mythifyResult = await this.mythicModule.mythify(identity, responseText);
        if (mythifyResult.applied) {
          responseText = mythifyResult.output;
        }
      } catch (error) {
        console.warn('[Orchestrator] Mythify failed:', error);
      }
    }

    // Sovereign Halo validation
    if (this.sovereignHalo && identity) {
      let attempts = 1;
      const maxAttempts = this.sovereignHalo['options']?.maxAttempts || 3;

      while (attempts <= maxAttempts) {
        const report = await this.sovereignHalo.validate(responseText, identity, attempts);
        
        if (report.status === 'passed') {
          return { responseText, validationReport: report, attempts };
        }

        if (attempts >= maxAttempts) {
          const failureReport = this.sovereignHalo.generateFailureReport(report, attempts, identity);
          responseText = failureReport.safeFallbackMessage;
          return { responseText, validationReport: report, attempts };
        }

        // Tighten constraints and regenerate
        const violations = report.checks.filter(c => !c.passed).map(c => c.detail);
        const tightenedPrompt = this.buildTightenedPrompt(systemPrompt, memories, queryText, violations, attempts);
        const newTemp = Math.max(0.1, (req.temperature || 0.7) - (attempts * 0.1));
        
        candidate = await provider.generate({
          model: 'demo',
          prompt: tightenedPrompt,
          maxTokens: req.maxTokens || 200,
          temperature: newTemp,
        });
        responseText = candidate.text || '';
        attempts++;
      }
    }

    return { responseText, attempts: 0 };
  }

  /**
   * Build a tightened prompt for regeneration attempts.
   */
  private buildTightenedPrompt(
    systemPrompt: string,
    memories: any[],
    queryText: string,
    violations: string[],
    attemptNumber: number
  ): string {
    const constraintBlock = violations.map(v => `- ${v}`).join("\n");
    const doNotBlock = violations
      .filter(v => v.toLowerCase().includes("must not contain") || v.toLowerCase().includes("forbidden"))
      .map(v => `DO NOT: ${v}`)
      .join("\n");
    
    return `${systemPrompt}\n\n[Attempt ${attemptNumber}]\nPrevious attempt failed these checks:\n${constraintBlock}${doNotBlock ? "\n\nStrictly avoid:\n" + doNotBlock : ""}\n\nMemories:\n${JSON.stringify(memories)}\nUser:\n${queryText}`;
  }

  /**
   * Save an audit record after generation. Best-effort: failures are logged but not thrown.
   */
  private async saveAuditRecord(
    req: OrchestratorRequest,
    response: OrchestratorResponse,
    identity: SigilIdentity | null,
    provider: any,
    startTime: number
  ): Promise<void> {
    if (!this.auditService || !identity) {
      return;
    }

    try {
      const provenance: AuditProvenance = {
        originalOutput: response.text,
        providerName: response.context.selectedProvider,
        modelVersion: provider.model || 'unknown',
        mythifyTransformations: [],
        regenerationAttempts: response.validationReport?.attemptNumber,
        validationReport: response.validationReport,
        memoryShards: response.context.relevantMemories.map((m: any) => ({
          id: m.doc?.id || 'unknown',
          excerpt: m.doc?.content?.substring(0, 200) || '',
          score: m.score,
        })),
      };

      const auditRecord: AuditRecordCreate = {
        identityId: identity.id,
        identityName: identity.name,
        identityVersion: identity.version,
        prompt: response.context.fullPrompt,
        output: response.text,
        reasoningTrace: response.reflectiveResult,
        validationReport: response.validationReport,
        provenance,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          apiVersion: CURRENT_API_VERSION,
        },
      };

      await this.auditService.save(auditRecord);
    } catch (error) {
      console.warn('[Orchestrator] Failed to save audit record:', error);
    }
  }
}

// Keep legacy function for compatibility if needed
export async function orchestrateReasoning(req: any) {
  const registry = ProviderRegistry.instance;
  const memoryService = new MemoryService();
  const orchestrator = new Orchestrator(memoryService, registry);
  
  const response = await orchestrator.process({
    identity_anchor: req.identity_anchor,
    messages: req.messages,
    policy: typeof req.options?.policy === 'object' ? req.options.policy : {},
    memoryAlpha: req.options?.alpha,
    memoryK: 5,
    maxTokens: req.options?.maxTokens,
    temperature: req.options?.temperature
  });

  return { 
    candidate: response.text, 
    reflectiveResult: response.reflectiveResult, 
    refinedCandidate: response.refinedCandidate,
    memories: response.context.relevantMemories 
  };
}
