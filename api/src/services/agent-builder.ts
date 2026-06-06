import { Orchestrator, OrchestratorRequest, OrchestratorResponse } from "./orchestrator";
import { MCPClient, ToolExecutionResult, MCPTool } from "./mcp-client";
import { ReasonRequest, ReasonResponse } from "../controllers/reason";
import { ToolCall, ToolDefinition } from "../adapters/ai-adapter";

export interface AgentBuilderConfig {
  enableTools?: boolean;
  maxToolIterations?: number;
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
              topMemories: result.context.relevantMemories.slice(0, 3).map((m) => ({
                id: m.doc.id || m.doc._id || "unknown",
                score: m.score,
                excerpt: (m.doc.content || (m.doc as any).note || "").substring(0, 150),
              })),
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
              topMemories: result.context.relevantMemories.slice(0, 3).map((m) => ({
                id: m.doc.id || m.doc._id || "unknown",
                score: m.score,
                excerpt: (m.doc.content || (m.doc as any).note || "").substring(0, 150),
              })),
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

  async shutdown(): Promise<void> {
    await this.mcpClient.stop();
  }
}
