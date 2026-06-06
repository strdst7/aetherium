import { ReasonResponse } from "../types/api-contracts";

/**
 * Backward compatibility tests ensure that existing API consumers
 * continue to work without modifications.
 */
describe("Backward Compatibility", () => {
  it("should have all required fields in ReasonResponse", () => {
    const response: ReasonResponse = {
      id: "test-123",
      output: "Test output",
      status: "approved",
      identity_anchor: "user-123",
      reasoning: {
        orchestrator: {
          selectedProvider: "gemini",
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
      apiVersion: "1.0.0",
    };

    // Required fields
    expect(response.id).toBeDefined();
    expect(response.output).toBeDefined();
    expect(response.status).toBeDefined();
    expect(response.identity_anchor).toBeDefined();
    expect(response.reasoning).toBeDefined();
    expect(response.apiVersion).toBeDefined();
  });

  it("should support optional tool fields (from Phase 1)", () => {
    const response: ReasonResponse = {
      id: "test-123",
      output: "Test output",
      status: "approved",
      identity_anchor: "user-123",
      reasoning: {
        orchestrator: {
          selectedProvider: "gemini",
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
      toolCalls: [
        { id: "1", name: "echo", arguments: { message: "hello" } },
      ],
      toolResults: [
        { success: true, data: { result: "hello" } },
      ],
      apiVersion: "1.0.0",
    };

    expect(response.toolCalls).toBeDefined();
    expect(response.toolResults).toBeDefined();
  });

  it("should support optional task fields (from Phase 2)", () => {
    const response: ReasonResponse = {
      id: "test-123",
      output: "Test output",
      status: "approved",
      identity_anchor: "user-123",
      reasoning: {
        orchestrator: {
          selectedProvider: "gemini",
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
      plan: {
        steps: [],
        description: "Test plan",
        estimatedSteps: 1,
      },
      actions: [
        { type: "report", title: "Test", data: {}, format: "json" },
      ],
      planStatus: "completed",
      apiVersion: "1.0.0",
    };

    expect(response.plan).toBeDefined();
    expect(response.actions).toBeDefined();
    expect(response.planStatus).toBeDefined();
  });

  it("should work without any optional fields", () => {
    const response: ReasonResponse = {
      id: "test-123",
      output: "Test output",
      status: "approved",
      identity_anchor: "user-123",
      reasoning: {
        orchestrator: {
          selectedProvider: "gemini",
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
      apiVersion: "1.0.0",
    };

    // None of these should be present
    expect(response.toolCalls).toBeUndefined();
    expect(response.toolResults).toBeUndefined();
    expect(response.toolExecutionTrace).toBeUndefined();
    expect(response.plan).toBeUndefined();
    expect(response.actions).toBeUndefined();
    expect(response.planStatus).toBeUndefined();
  });

  it("should preserve existing field names and types", () => {
    const response: ReasonResponse = {
      id: "test-123",
      output: "Test output",
      status: "approved",
      identity_anchor: "user-123",
      reasoning: {
        orchestrator: {
          selectedProvider: "gemini",
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
      apiVersion: "1.0.0",
    };

    // Verify field names haven't changed
    expect(response).toHaveProperty("id");
    expect(response).toHaveProperty("output");
    expect(response).toHaveProperty("status");
    expect(response).toHaveProperty("identity_anchor");
    expect(response).toHaveProperty("reasoning");
    expect(response).toHaveProperty("apiVersion");
  });

  it("should maintain status enum values", () => {
    const statuses: Array<"approved" | "refine" | "reject"> = [
      "approved",
      "refine",
      "reject",
    ];

    statuses.forEach((status) => {
      const response: ReasonResponse = {
        id: "test",
        output: "test",
        status,
        identity_anchor: "test",
        reasoning: {
          orchestrator: {
            selectedProvider: "test",
            relevantMemoriesCount: 0,
            topMemories: [],
          },
          reflective: {
            status,
            violations: [],
            suggestedConstraints: [],
            confidenceScore: 1.0,
          },
          trace: [],
        },
        apiVersion: "1.0.0",
      };

      expect(response.status).toBe(status);
    });
  });

  it("should accept metadata as arbitrary object", () => {
    const response: ReasonResponse = {
      id: "test-123",
      output: "Test output",
      status: "approved",
      identity_anchor: "user-123",
      reasoning: {
        orchestrator: {
          selectedProvider: "gemini",
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
      metadata: {
        processingTimeMs: 100,
        version: "1.0",
        customField: "custom value",
        nested: { key: "value" },
      },
      apiVersion: "1.0.0",
    };

    expect(response.metadata).toBeDefined();
    expect(response.metadata?.customField).toBe("custom value");
  });
});
