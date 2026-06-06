import { Orchestrator, OrchestratorRequest, OrchestratorResponse } from "../services/orchestrator";
import { ReflectiveService, ReflectiveCheckResult } from "../services/reflective-service";
import { AgentBuilder } from "../services/agent-builder";
import { ToolCall } from "../adapters/ai-adapter";
import { ToolExecutionResult } from "../services/mcp-client";
import {
  CURRENT_API_VERSION,
  ActionType,
  PlanStatus,
  PlanStep,
  TaskPlan,
  Action,
  ReasonRequest,
  ReasoningTrace,
  ToolExecutionTrace,
  ReasonResponse,
} from "../types/api-contracts";

export class ReasonController {
  private orchestrator: Orchestrator;
  private reflectiveService: ReflectiveService;
  private agentBuilder?: AgentBuilder;

  constructor(orchestrator: Orchestrator, reflectiveService: ReflectiveService, agentBuilder?: AgentBuilder) {
    this.orchestrator = orchestrator;
    this.reflectiveService = reflectiveService;
    this.agentBuilder = agentBuilder;
  }

  async handleReason(req: ReasonRequest): Promise<ReasonResponse> {
    const trace: ReasoningTrace[] = [];
    const startTime = Date.now();

    try {
      // Validate input
      trace.push({
        stage: "validation",
        timestamp: new Date().toISOString(),
        details: { identity_anchor: req.identity_anchor, messageCount: req.messages.length },
      });

      this.validateRequest(req);

      // Step 1: Call orchestrator
      trace.push({
        stage: "orchestrator_start",
        timestamp: new Date().toISOString(),
        details: {
          policy: req.options?.policy || {},
          memoryK: req.options?.memoryK || 5,
        },
      });

      const orchestratorReq: OrchestratorRequest = {
        identity_anchor: req.identity_anchor,
        messages: req.messages,
        maxTokens: req.options?.maxTokens || 512,
        temperature: req.options?.temperature || 0.7,
        policy: typeof req.options?.policy === 'object' ? req.options.policy : {},
        memoryAlpha: req.options?.memoryAlpha || 0.5,
        memoryK: req.options?.memoryK || 5,
      };

      let orchestratorResponse: OrchestratorResponse;
      let toolCalls: ToolCall[] | undefined;
      let toolResults: ToolExecutionResult[] | undefined;
      let toolExecutionTrace: ToolExecutionTrace[] | undefined;
      let plan: TaskPlan | undefined;
      let actions: Action[] | undefined;
      let planStatus: PlanStatus | undefined;

      // Determine mode: explicit or auto-detected
      const mode = this.detectMode(req);
      const isTaskMode = mode === 'task';

      // Use AgentBuilder when enableTools is true
      if (req.options?.enableTools && this.agentBuilder) {
        trace.push({
          stage: "agent_builder_mode",
          timestamp: new Date().toISOString(),
          details: { mode, isTaskMode },
        });

        if (isTaskMode) {
          trace.push({
            stage: "agent_builder_task_start",
            timestamp: new Date().toISOString(),
            details: { maxTaskIterations: req.options?.maxTaskIterations || 20 },
          });

          const agentResult = await this.agentBuilder.executeTask(req, {
            enableTools: true,
            maxTaskIterations: req.options?.maxTaskIterations || 20,
          });

          orchestratorResponse = {
            id: agentResult.response.id,
            text: agentResult.response.output,
            context: {
              identity_anchor: req.identity_anchor,
              queryEmbedding: [],
              relevantMemories: [],
              systemPrompt: "",
              fullPrompt: "",
              selectedProvider: agentResult.response.reasoning.orchestrator.selectedProvider,
            },
            reflectiveResult: agentResult.response.reasoning.reflective,
          };
          toolCalls = agentResult.toolCalls;
          toolResults = agentResult.toolResults;
          toolExecutionTrace = agentResult.toolExecutionTrace;
          plan = agentResult.response.plan;
          actions = agentResult.response.actions;
          planStatus = agentResult.response.planStatus;

          trace.push({
            stage: "agent_builder_task_complete",
            timestamp: new Date().toISOString(),
            details: {
              selectedProvider: agentResult.response.reasoning.orchestrator.selectedProvider,
              planStatus: agentResult.response.planStatus,
              actionsCount: actions?.length || 0,
              toolCallsCount: toolCalls?.length || 0,
            },
          });
        } else {
          trace.push({
            stage: "agent_builder_start",
            timestamp: new Date().toISOString(),
            details: { enableTools: true },
          });

          const agentResult = await this.agentBuilder.execute(req, {
            enableTools: true,
            maxToolIterations: 5,
          });

          orchestratorResponse = {
            id: agentResult.response.id,
            text: agentResult.response.output,
            context: {
              identity_anchor: req.identity_anchor,
              queryEmbedding: [],
              relevantMemories: [],
              systemPrompt: "",
              fullPrompt: "",
              selectedProvider: agentResult.response.reasoning.orchestrator.selectedProvider,
            },
            reflectiveResult: agentResult.response.reasoning.reflective,
          };
          toolCalls = agentResult.toolCalls;
          toolResults = agentResult.toolResults;
          toolExecutionTrace = agentResult.toolExecutionTrace;

          trace.push({
            stage: "agent_builder_complete",
            timestamp: new Date().toISOString(),
            details: {
              selectedProvider: agentResult.response.reasoning.orchestrator.selectedProvider,
              toolCallsCount: toolCalls?.length || 0,
            },
          });
        }
      } else {
        orchestratorResponse = await this.orchestrator.process(orchestratorReq);
      }

      trace.push({
        stage: "orchestrator_complete",
        timestamp: new Date().toISOString(),
        details: {
          selectedProvider: orchestratorResponse.context.selectedProvider,
          relevantMemoriesCount: orchestratorResponse.context.relevantMemories.length,
          candidateLength: orchestratorResponse.text.length,
        },
      });

      // Step 2: Call reflective service
      trace.push({
        stage: "reflective_check_start",
        timestamp: new Date().toISOString(),
        details: {},
      });

      let reflectiveResult: ReflectiveCheckResult;
      if (req.options?.skipReflection) {
        reflectiveResult = {
          status: "approved",
          violations: [],
          suggestedConstraints: [],
          confidenceScore: 1.0,
        };
      } else {
        reflectiveResult = await this.reflectiveService.check(
          orchestratorResponse.text,
          orchestratorResponse.context
        );
      }

      trace.push({
        stage: "reflective_check_complete",
        timestamp: new Date().toISOString(),
        details: {
          status: reflectiveResult.status,
          violationCount: reflectiveResult.violations.length,
          confidenceScore: reflectiveResult.confidenceScore,
        },
      });

      // Step 3: Build response
      const extractContent = (doc: any): string => doc?.content || doc?.note || "";
      const extractId = (doc: any): string => doc?.id || doc?._id?.toString() || "unknown";
      const topMemories = orchestratorResponse.context.relevantMemories.slice(0, 3).map((m) => ({
        id: extractId(m.doc),
        score: m.score,
        excerpt: extractContent(m.doc).substring(0, 150),
      }));

      const response: ReasonResponse = {
        id: orchestratorResponse.id,
        output: orchestratorResponse.text,
        status: reflectiveResult.status,
        identity_anchor: req.identity_anchor,
        reasoning: {
          orchestrator: {
            selectedProvider: orchestratorResponse.context.selectedProvider,
            relevantMemoriesCount: orchestratorResponse.context.relevantMemories.length,
            topMemories,
          },
          reflective: reflectiveResult,
          trace,
        },
        toolCalls,
        toolResults,
        toolExecutionTrace,
        plan,
        actions,
        planStatus,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          version: "1.0",
          mode: isTaskMode ? 'task' : 'tool',
        },
        apiVersion: CURRENT_API_VERSION,
        identity: orchestratorResponse.context.identity
          ? {
              id: orchestratorResponse.context.identity.id,
              name: orchestratorResponse.context.identity.name,
              version: orchestratorResponse.context.identity.version,
            }
          : undefined,
      };

      trace.push({
        stage: "response_complete",
        timestamp: new Date().toISOString(),
        details: {
          totalProcessingTimeMs: response.metadata?.processingTimeMs,
        },
      });

      return response;
    } catch (error) {
      trace.push({
        stage: "error",
        timestamp: new Date().toISOString(),
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  private validateRequest(req: ReasonRequest): void {
    if (!req.identity_anchor || typeof req.identity_anchor !== "string") {
      throw new Error("identity_anchor is required and must be a string");
    }

    if (!Array.isArray(req.messages) || req.messages.length === 0) {
      throw new Error("messages array is required and must not be empty");
    }

    for (const msg of req.messages) {
      if (!msg.role || !msg.content) {
        throw new Error("Each message must have 'role' and 'content' fields");
      }
    }

    if (req.options?.maxTokens !== undefined && req.options.maxTokens < 1) {
      throw new Error("maxTokens must be greater than 0");
    }

    if (req.options?.temperature !== undefined && (req.options.temperature < 0 || req.options.temperature > 2)) {
      throw new Error("temperature must be between 0 and 2");
    }

    if (req.options?.memoryK !== undefined && req.options.memoryK < 1) {
      throw new Error("memoryK must be greater than 0");
    }

    if (req.options?.memoryAlpha !== undefined && (req.options.memoryAlpha < 0 || req.options.memoryAlpha > 1)) {
      throw new Error("memoryAlpha must be between 0 and 1");
    }
  }

  private detectMode(req: ReasonRequest): "tool" | "task" {
    // Explicit mode takes precedence
    if (req.options?.mode === "task" || req.options?.mode === "tool") {
      return req.options.mode;
    }

    // Auto-detection heuristic
    const queryText = req.messages.map((m) => m.content).join(" ").toLowerCase();
    
    // Task mode keywords: multi-step, sequential, and then, find and update, etc.
    const taskKeywords = [
      "find and", "query and", "search and", "update and", "delete and",
      "create and", "then", "after that", "next", "finally",
      "multiple steps", "multi-step", "plan", "execute",
      "retrieve all", "get all", "list all", "for each",
      "batch", "bulk", "mass update", "in bulk",
    ];

    const hasTaskKeywords = taskKeywords.some((keyword) => new RegExp(`\\b${keyword}\\b`).test(queryText));
    
    // Also check for compound sentences (multiple verbs)
    const verbs = ["find", "query", "search", "update", "delete", "create", "insert", "modify"];
    const verbCount = verbs.filter((verb) => new RegExp(`\\b${verb}\\b`).test(queryText)).length;
    const hasMultipleVerbs = verbCount >= 2;

    if (hasTaskKeywords || hasMultipleVerbs) {
      return "task";
    }

    return "tool";
  }
}

// Express middleware factory
export function createReasonRouter(
  orchestrator: Orchestrator,
  reflectiveService: ReflectiveService,
  agentBuilder?: AgentBuilder
) {
  const controller = new ReasonController(orchestrator, reflectiveService, agentBuilder);

  return async (req: any, res: any, next: any) => {
    try {
      const input: ReasonRequest = req.body;
      const response = await controller.handleReason(input);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
