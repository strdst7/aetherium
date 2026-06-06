import { Orchestrator, OrchestratorRequest, OrchestratorResponse } from "./orchestrator";
import { MCPClient, ToolExecutionResult, MCPTool } from "./mcp-client";
import { ReasonRequest, ReasonResponse, TaskPlan, PlanStep, Action, ActionType } from "../types/api-contracts";
import { ToolCall, ToolDefinition } from "../adapters/ai-adapter";

export interface AgentBuilderConfig {
  enableTools?: boolean;
  maxToolIterations?: number;
  maxTaskIterations?: number;
}

export interface ToolExecutionTrace {
  step: number;
  toolCall: ToolCall;
  result: ToolExecutionResult;
  timestamp: string;
}

export interface AgentBuilderResult {
  response: ReasonResponse;
  toolCalls?: ToolCall[];
  toolResults?: ToolExecutionResult[];
  toolExecutionTrace?: ToolExecutionTrace[];
}

/**
 * AgentBuilder wraps the existing Orchestrator and manages tool registration.
 * It delegates memory retrieval, prompt building, and reflection to the Orchestrator.
 */
export class AgentBuilder {
  private orchestrator: Orchestrator;
  private mcpClient: MCPClient;
  private config: AgentBuilderConfig;
  private tools: ToolDefinition[] = [];

  constructor(
    orchestrator: Orchestrator,
    mcpClient: MCPClient,
    config: AgentBuilderConfig = {}
  ) {
    this.orchestrator = orchestrator;
    this.mcpClient = mcpClient;
    this.config = {
      enableTools: true,
      maxToolIterations: 5,
      maxTaskIterations: 20,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    try {
      await this.mcpClient.start();
      const mcpTools = await this.mcpClient.discoverTools();
      this.tools = mcpTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));
      console.log(`[AgentBuilder] Discovered ${this.tools.length} tools from MCP server`);
    } catch (error) {
      console.warn(`[AgentBuilder] Failed to initialize MCP client: ${error instanceof Error ? error.message : String(error)}`);
      this.tools = [];
    }
  }

  async execute(req: ReasonRequest, config?: AgentBuilderConfig): Promise<AgentBuilderResult> {
    const effectiveConfig = { ...this.config, ...config };

    if (!effectiveConfig.enableTools || !this.mcpClient.isHealthy() || this.tools.length === 0) {
      if (effectiveConfig.enableTools && this.tools.length === 0) {
        console.warn('[AgentBuilder] Tools enabled but no tools discovered — falling back to standard reasoning');
      }
      // Standard reasoning path (no tools)
      const orchestratorReq: OrchestratorRequest = {
        identity_anchor: req.identity_anchor,
        messages: req.messages,
        maxTokens: req.options?.maxTokens,
        temperature: req.options?.temperature,
        policy: req.options?.policy,
        memoryAlpha: req.options?.memoryAlpha,
        memoryK: req.options?.memoryK,
      };

      const result = await this.orchestrator.process(orchestratorReq);

      return {
        response: {
          id: result.id,
          output: result.text,
          status: (result.reflectiveResult?.status as any) || "approved",
          identity_anchor: req.identity_anchor,
          reasoning: {
            orchestrator: {
              selectedProvider: result.context.selectedProvider,
              relevantMemoriesCount: result.context.relevantMemories.length,
              topMemories: this.mapTopMemories(result.context.relevantMemories),
            },
            reflective: result.reflectiveResult as any,
            trace: [],
          },
          metadata: { version: "1.0" },
        },
      };
    }

    // Tool-enabled reasoning path
    const toolExecutionTrace: ToolExecutionTrace[] = [];
    const toolCalls: ToolCall[] = [];
    const toolResults: ToolExecutionResult[] = [];

    try {
      const orchestratorReq: OrchestratorRequest = {
        identity_anchor: req.identity_anchor,
        messages: req.messages,
        maxTokens: req.options?.maxTokens,
        temperature: req.options?.temperature,
        policy: { ...req.options?.policy, requireToolUse: true },
        memoryAlpha: req.options?.memoryAlpha,
        memoryK: req.options?.memoryK,
      };

      let result = await this.orchestrator.processWithTools(orchestratorReq, this.tools);
      let iteration = 0;

      // Tool loop
      while (result.toolCalls && result.toolCalls.length > 0 && iteration < (effectiveConfig.maxToolIterations || 5)) {
        iteration++;

        for (const toolCall of result.toolCalls) {
          const execResult = await this.mcpClient.executeTool(toolCall.name, toolCall.arguments);
          toolExecutionTrace.push({
            step: iteration,
            toolCall,
            result: execResult,
            timestamp: new Date().toISOString(),
          });
          toolCalls.push(toolCall);
          toolResults.push(execResult);
        }

        // Re-generate with tool results
        const toolResultsContext = toolExecutionTrace.filter((t) => t.step === iteration);
        const followUpMessages = [
          ...req.messages,
          {
            role: "system",
            content: `Tool results: ${JSON.stringify(toolResultsContext)}`,
          },
        ];

        const followUpReq: OrchestratorRequest = {
          ...orchestratorReq,
          messages: followUpMessages,
        };

        result = await this.orchestrator.processWithTools(followUpReq, this.tools);
      }

      return {
        response: {
          id: result.id,
          output: result.text,
          status: (result.reflectiveResult?.status as any) || "approved",
          identity_anchor: req.identity_anchor,
          reasoning: {
            orchestrator: {
              selectedProvider: result.context.selectedProvider,
              relevantMemoriesCount: result.context.relevantMemories.length,
              topMemories: this.mapTopMemories(result.context.relevantMemories),
            },
            reflective: result.reflectiveResult as any,
            trace: [],
          },
          toolCalls,
          toolResults,
          toolExecutionTrace,
          metadata: { version: "1.0", toolIterations: iteration },
        },
        toolCalls,
        toolResults,
        toolExecutionTrace,
      };
    } catch (error) {
      // Structured error per D-12
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        response: {
          id: `error-${Date.now()}`,
          output: "",
          status: "reject",
          identity_anchor: req.identity_anchor,
          reasoning: {
            orchestrator: {
              selectedProvider: "",
              relevantMemoriesCount: 0,
              topMemories: [],
            },
            reflective: {
              status: "reject",
              violations: [{ rule: "TOOL_EXECUTION_ERROR", severity: "error", message: errorMessage }],
              suggestedConstraints: [],
              confidenceScore: 0,
            },
            trace: [],
          },
          toolExecutionTrace,
          metadata: { version: "1.0", error: errorMessage },
        },
        toolExecutionTrace,
      };
    }
  }

  async executeTask(req: ReasonRequest, config?: AgentBuilderConfig): Promise<AgentBuilderResult> {
    const effectiveConfig = { ...this.config, ...config };
    const maxIterations = effectiveConfig.maxTaskIterations || 20;

    try {
      // Step 1: Generate plan
      const orchestratorReq: OrchestratorRequest = {
        identity_anchor: req.identity_anchor,
        messages: req.messages,
        maxTokens: req.options?.maxTokens,
        temperature: req.options?.temperature,
        policy: { ...req.options?.policy, requireToolUse: true },
        memoryAlpha: req.options?.memoryAlpha,
        memoryK: req.options?.memoryK,
      };

      const plan = await this.orchestrator.generatePlan(orchestratorReq, this.tools);

      // Step 2: Execute plan steps
      const toolExecutionTrace: ToolExecutionTrace[] = [];
      const toolCalls: ToolCall[] = [];
      const toolResults: ToolExecutionResult[] = [];
      const actions: Action[] = [];
      let completedSteps = 0;
      let failedSteps = 0;

      for (let i = 0; i < plan.steps.length && i < maxIterations; i++) {
        const step = plan.steps[i];
        step.status = "in_progress";

        let execResult: ToolExecutionResult = { success: false, error: "No execution result" };
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
          attempts++;
          try {
            const args = attempts === 1 ? step.args : { ...step.args, _retry: true };
            execResult = await this.mcpClient.executeTool(step.tool, args);
            
            if (execResult.success) {
              break;
            }
            
            // If failed and not yet retried, continue to next attempt
            if (attempts < maxAttempts) {
              continue;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            execResult = { success: false, error: errorMessage };
            
            // If exception and not yet retried, continue to next attempt
            if (attempts < maxAttempts) {
              continue;
            }
          }
        }

        if (execResult.success) {
          step.status = "completed";
          completedSteps++;
        } else {
          step.status = "failed";
          failedSteps++;
        }

        toolExecutionTrace.push({
          step: i + 1,
          toolCall: { id: `step-${i}`, name: step.tool, arguments: step.args },
          result: execResult,
          timestamp: new Date().toISOString(),
        });
        toolCalls.push({ id: `step-${i}`, name: step.tool, arguments: step.args });
        toolResults.push(execResult);
      }

      // Step 3: Synthesize actions from tool results
      for (const result of toolResults) {
        if (result.success) {
          if (typeof result.data === 'object' && result.data !== null) {
            if (Array.isArray(result.data)) {
              actions.push({
                type: "report" as ActionType,
                title: "Query Results",
                data: result.data,
                format: "json",
              });
            } else if (result.data.modifiedCount !== undefined) {
              actions.push({
                type: "update" as ActionType,
                title: "Data Update",
                data: result.data,
                format: "json",
              });
            } else {
              actions.push({
                type: "report" as ActionType,
                title: "Tool Result",
                data: result.data,
                format: "json",
              });
            }
          } else {
            actions.push({
              type: "report" as ActionType,
              title: "Tool Result",
              data: result.data,
              format: "string",
            });
          }
        }
      }

      // Step 4: Determine plan status
      const allStepsAttempted = completedSteps + failedSteps >= plan.steps.length;
      const planStatus: "completed" | "partial" | "failed" =
        allStepsAttempted && failedSteps === 0 ? "completed" :
        completedSteps > 0 ? "partial" : "failed";

      // Step 5: Build final response
      const outputText = `Task execution ${planStatus}. ${completedSteps} of ${plan.steps.length} steps completed successfully.${failedSteps > 0 ? ` ${failedSteps} steps failed.` : ""}`;

      return {
        response: {
          id: `task-${Date.now()}`,
          output: outputText,
          status: "approved",
          identity_anchor: req.identity_anchor,
          reasoning: {
            orchestrator: {
              selectedProvider: "unknown",
              relevantMemoriesCount: 0,
              topMemories: [],
            },
            reflective: {
              status: "approved",
              violations: [],
              suggestedConstraints: [],
              confidenceScore: plan.steps.length > 0 ? completedSteps / plan.steps.length : 0,
            },
            trace: [],
          },
          plan,
          actions,
          planStatus,
          toolCalls,
          toolResults,
          toolExecutionTrace,
          metadata: { version: "1.0", mode: "task", completedSteps, failedSteps, maxIterations },
        },
        toolCalls,
        toolResults,
        toolExecutionTrace,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        response: {
          id: `task-error-${Date.now()}`,
          output: "",
          status: "reject",
          identity_anchor: req.identity_anchor,
          reasoning: {
            orchestrator: {
              selectedProvider: "",
              relevantMemoriesCount: 0,
              topMemories: [],
            },
            reflective: {
              status: "reject",
              violations: [{ rule: "TASK_EXECUTION_ERROR", severity: "error", message: errorMessage }],
              suggestedConstraints: [],
              confidenceScore: 0,
            },
            trace: [],
          },
          metadata: { version: "1.0", error: errorMessage },
        },
      };
    }
  }

  private mapTopMemories(memories: Array<{ doc: Record<string, any>; score: number }>, count = 3) {
    return memories.slice(0, count).map((m) => ({
      id: m.doc.id || m.doc._id || "unknown",
      score: m.score,
      excerpt: (m.doc.content || (m.doc as any).note || "").substring(0, 150),
    }));
  }

  async shutdown(): Promise<void> {
    await this.mcpClient.stop();
  }
}
