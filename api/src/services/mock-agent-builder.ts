import { AgentBuilderConfig, AgentBuilderResult } from "./agent-builder";
import { ReasonRequest } from "../controllers/reason";
import { ToolCall } from "../adapters/ai-adapter";
import { ToolExecutionResult } from "./mcp-client";

export class MockAgentBuilder {
  private mockTools: any[];

  constructor(mockTools: any[] = []) {
    this.mockTools = mockTools;
  }

  async initialize(): Promise<void> {
    // No-op
  }

  async execute(req: ReasonRequest, config?: AgentBuilderConfig): Promise<AgentBuilderResult> {
    const enableTools = config?.enableTools ?? false;

    if (!enableTools) {
      return {
        response: {
          id: `mock-${Date.now()}`,
          output: "Mock response without tools",
          status: "approved",
          identity_anchor: req.identity_anchor,
          reasoning: {
            orchestrator: {
              selectedProvider: "mock",
              relevantMemoriesCount: 0,
              topMemories: [],
            },
            reflective: {
              status: "approved",
              violations: [],
              suggestedConstraints: [],
              confidenceScore: 1.0,
            },
            trace: [],
          },
          metadata: { version: "1.0" },
        },
      };
    }

    // Simulate tool execution
    const toolCalls: ToolCall[] = [
      { id: "1", name: "echo", arguments: { message: "hello" } },
    ];
    const toolResults: ToolExecutionResult[] = [
      { success: true, data: "hello" },
    ];

    return {
      response: {
        id: `mock-${Date.now()}`,
        output: "Mock response with tools",
        status: "approved",
        identity_anchor: req.identity_anchor,
        reasoning: {
          orchestrator: {
            selectedProvider: "mock",
            relevantMemoriesCount: 0,
            topMemories: [],
          },
          reflective: {
            status: "approved",
            violations: [],
            suggestedConstraints: [],
            confidenceScore: 1.0,
          },
          trace: [],
        },
        toolCalls,
        toolResults,
        toolExecutionTrace: [
          {
            step: 1,
            toolCall: toolCalls[0],
            result: toolResults[0],
            timestamp: new Date().toISOString(),
          },
        ],
        metadata: { version: "1.0" },
      },
    };
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}
