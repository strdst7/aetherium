import { ProviderRegistry } from './provider-registry';
import { MemoryService, VectorSearchResult } from './memory-service';
import { ReflectiveService } from './reflective-service';
import { ToolDefinition, ToolCall } from '../adapters/ai-adapter';
import { TaskPlan, PlanStep } from '../controllers/reason';

export interface OrchestratorContext {
  identity_anchor: string;
  queryEmbedding: number[];
  relevantMemories: VectorSearchResult[];
  systemPrompt: string;
  fullPrompt: string;
  selectedProvider: string;
  toolExecutionTrace?: any[];
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
}

export class Orchestrator {
  private memoryService: MemoryService;
  private providerRegistry: ProviderRegistry;
  private reflectiveService: ReflectiveService;

  constructor(memoryService: MemoryService, providerRegistry: ProviderRegistry) {
    this.memoryService = memoryService;
    this.providerRegistry = providerRegistry;
    this.reflectiveService = new ReflectiveService();
  }

  async process(req: OrchestratorRequest): Promise<OrchestratorResponse> {
    const { identity_anchor, messages, policy = {}, memoryAlpha = 0.5, memoryK = 5 } = req;
    const queryText = messages.map((m: any) => m.content).join(' ');

    // Step 1: compute embedding
    const provider = await this.providerRegistry.pick({ ...policy, requireEmbeddings: true });
    let embedding: number[] = [0];
    if (provider.embed) {
      const embedResult = await provider.embed(queryText);
      embedding = Array.isArray(embedResult.embeddings[0]) 
        ? (embedResult.embeddings[0] as number[]) 
        : (embedResult.embeddings as number[]);
    }

    // Step 2: memory retrieval
    const memories = await this.memoryService.vectorSearch(embedding, memoryAlpha, memoryK);

    // Step 3: build prompt
    const systemPrompt = 'System: You are Aetherium, preserve identity fidelity.';
    const prompt = `${systemPrompt}\nMemories:\n${JSON.stringify(memories)}\nUser:\n${queryText}`;

    // Step 4: generate candidate
    const candidate = await provider.generate({ 
      model: 'demo', 
      prompt,
      maxTokens: req.maxTokens,
      temperature: req.temperature
    });
    const responseText = candidate.text || (candidate.choices && candidate.choices[0]?.message?.content) || '';

    const context: OrchestratorContext = {
      identity_anchor,
      queryEmbedding: embedding,
      relevantMemories: memories,
      systemPrompt,
      fullPrompt: prompt,
      selectedProvider: provider.name
    };

    // 7. Reflective Layer evaluation
    const reflectiveResult = this.reflectiveService.evaluate({ text: responseText }, memories);

    // 8. If refine, re‑generate with constraints
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

      const refined = await provider.generate({
        model: "demo",
        prompt: constrainedPrompt,
        maxTokens: req.maxTokens || 200,
        temperature: req.temperature || 0.2
      });

      return {
        id: candidate.id || `res_${Date.now()}`,
        text: responseText,
        context,
        reflectiveResult,
        refinedCandidate: refined
      };
    }

    return {
      id: candidate.id || `res_${Date.now()}`,
      text: responseText,
      context,
      reflectiveResult
    };
  }

  async processWithTools(req: OrchestratorRequest, tools: ToolDefinition[]): Promise<OrchestratorResponse> {
    const { identity_anchor, messages, policy = {}, memoryAlpha = 0.5, memoryK = 5 } = req;
    const queryText = messages.map((m: any) => m.content).join(' ');

    // Step 1: compute embedding
    const provider = await this.providerRegistry.pick({ ...policy, requireEmbeddings: true, requireToolUse: true });
    let embedding: number[] = [0];
    if (provider.embed) {
      const embedResult = await provider.embed(queryText);
      embedding = Array.isArray(embedResult.embeddings[0]) 
        ? (embedResult.embeddings[0] as number[]) 
        : (embedResult.embeddings as number[]);
    }

    // Step 2: memory retrieval
    const memories = await this.memoryService.vectorSearch(embedding, memoryAlpha, memoryK);

    // Step 3: build prompt
    const systemPrompt = 'System: You are Aetherium, preserve identity fidelity.';
    const prompt = `${systemPrompt}\nMemories:\n${JSON.stringify(memories)}\nUser:\n${queryText}`;

    // Step 4: generate with tools
    if (!provider.generateWithTools) {
      throw new Error('Provider does not support tool use');
    }

    const candidate = await provider.generateWithTools({
      model: 'gemini-1.5-pro',
      prompt,
      maxTokens: req.maxTokens,
      temperature: req.temperature
    }, tools);

    const responseText = candidate.text || '';

    const context: OrchestratorContext = {
      identity_anchor,
      queryEmbedding: embedding,
      relevantMemories: memories,
      systemPrompt,
      fullPrompt: prompt,
      selectedProvider: provider.name
    };

    // Step 5: Reflective evaluation
    const reflectiveResult = this.reflectiveService.evaluate({ text: responseText }, memories);

    return {
      id: candidate.id || `res_${Date.now()}`,
      text: responseText,
      context,
      reflectiveResult,
      toolCalls: candidate.toolCalls
    };
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
