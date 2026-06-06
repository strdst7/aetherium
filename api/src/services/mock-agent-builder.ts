import { AgentBuilderConfig, AgentBuilderResult } from "./agent-builder";
import { ReasonRequest, TaskPlan, PlanStep, Action, ActionType } from "../controllers/reason";
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
    };
  }

  async executeTask(req: ReasonRequest, config?: AgentBuilderConfig): Promise<AgentBuilderResult> {
    const maxIterations = config?.maxTaskIterations || 10;
    
    // Simulate plan generation
    const plan: TaskPlan = {
      description: "Mock task plan",
      estimatedSteps: 2,
      steps: [
        {
          stepNumber: 1,
          tool: "query",
          args: { collection: "users", filter: { status: "inactive" } },
          expectedResult: "List of inactive users",
          status: "completed",
          retryCount: 0,
        },
        {
          stepNumber: 2,
          tool: "update",
          args: { collection: "users", filter: { status: "inactive" }, update: { status: "active" } },
          expectedResult: "Updated user statuses",
          status: "completed",
          retryCount: 0,
        },
      ],
    };

    // Simulate step execution
    const toolCalls: ToolCall[] = plan.steps.map((step: PlanStep) => ({
      id: `mock-${step.stepNumber}`,
      name: step.tool,
      arguments: step.args,
    }));

    const toolResults: ToolExecutionResult[] = [
      { success: true, data: [{ id: "1", name: "Alice", status: "inactive" }] },
      { success: true, data: { modifiedCount: 1 } },
    ];

    // Synthesize actions
    const actions: Action[] = [
      {
        type: "report" as ActionType,
        title: "Inactive Users Query",
        data: { users: [{ id: "1", name: "Alice", status: "inactive" }] },
        format: "json",
      },
      {
        type: "update" as ActionType,
        title: "Update User Statuses",
        data: { modifiedCount: 1 },
        format: "json",
      },
    ];

    const toolExecutionTrace = toolCalls.map((tc, index) => ({
      step: index + 1,
      toolCall: tc,
      result: toolResults[index],
      timestamp: new Date().toISOString(),
    }));

    return {
      response: {
        id: `mock-task-${Date.now()}`,
        output: "Mock task execution completed. Found 1 inactive user and updated their status.",
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
        plan,
        actions,
        planStatus: "completed",
        toolCalls,
        toolResults,
        toolExecutionTrace,
        metadata: { version: "1.0", mode: "task", maxIterations },
      },
      toolCalls,
      toolResults,
      toolExecutionTrace,
    };
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}
