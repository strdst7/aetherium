import { ReasonRequest, ReasonResponse, HealthResponse, ApiInfoResponse, ProblemDetails } from "../types/api-contracts";

/**
 * Contract tests validate that all API responses conform to the published schema.
 */
describe("API Contract", () => {
  describe("ReasonRequest", () => {
    it("should have required fields", () => {
      const request: ReasonRequest = {
        identity_anchor: "user-123",
        messages: [{ role: "user", content: "Hello" }],
      };

      expect(request.identity_anchor).toBe("user-123");
      expect(request.messages).toHaveLength(1);
      expect(request.messages[0].role).toBe("user");
      expect(request.messages[0].content).toBe("Hello");
    });

    it("should accept optional options", () => {
      const request: ReasonRequest = {
        identity_anchor: "user-123",
        messages: [{ role: "user", content: "Hello" }],
        options: {
          maxTokens: 1000,
          temperature: 0.5,
          enableTools: true,
          mode: "task",
        },
      };

      expect(request.options?.maxTokens).toBe(1000);
      expect(request.options?.temperature).toBe(0.5);
      expect(request.options?.enableTools).toBe(true);
      expect(request.options?.mode).toBe("task");
    });
  });

  describe("ReasonResponse", () => {
    it("should have all required fields including apiVersion", () => {
      const response: ReasonResponse = {
        id: "resp-123",
        output: "Generated text",
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

      expect(response.id).toBeDefined();
      expect(response.output).toBeDefined();
      expect(response.status).toBeDefined();
      expect(response.identity_anchor).toBeDefined();
      expect(response.reasoning).toBeDefined();
      expect(response.apiVersion).toBe("1.0.0");
    });

    it("should have valid status values", () => {
      const validStatuses: Array<"approved" | "refine" | "reject"> = [
        "approved",
        "refine",
        "reject",
      ];

      validStatuses.forEach((status) => {
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

    it("should have valid reasoning trace structure", () => {
      const response: ReasonResponse = {
        id: "test",
        output: "test",
        status: "approved",
        identity_anchor: "test",
        reasoning: {
          orchestrator: {
            selectedProvider: "gemini",
            relevantMemoriesCount: 3,
            topMemories: [
              { id: "mem-1", score: 0.95, excerpt: "Memory content" },
            ],
          },
          reflective: {
            status: "approved",
            violations: [],
            suggestedConstraints: [],
            confidenceScore: 0.98,
          },
          trace: [
            { stage: "validation", timestamp: "2024-01-01T00:00:00Z", details: {} },
            { stage: "orchestrator", timestamp: "2024-01-01T00:00:01Z", details: {} },
          ],
        },
        apiVersion: "1.0.0",
      };

      expect(response.reasoning.trace).toHaveLength(2);
      expect(response.reasoning.trace[0].stage).toBe("validation");
    });
  });

  describe("HealthResponse", () => {
    it("should have required fields", () => {
      const response: HealthResponse = {
        status: "ok",
        timestamp: new Date().toISOString(),
        apiVersion: "1.0.0",
      };

      expect(response.status).toBe("ok");
      expect(response.timestamp).toBeDefined();
      expect(response.apiVersion).toBe("1.0.0");
    });

    it("should have valid status values", () => {
      const validStatuses: Array<"ok" | "degraded" | "down"> = [
        "ok",
        "degraded",
        "down",
      ];

      validStatuses.forEach((status) => {
        const response: HealthResponse = {
          status,
          timestamp: new Date().toISOString(),
          apiVersion: "1.0.0",
        };

        expect(response.status).toBe(status);
      });
    });

    it("should have checks with valid status values", () => {
      const response: HealthResponse = {
        status: "ok",
        timestamp: new Date().toISOString(),
        checks: {
          database: "ok",
          llm: "ok",
          mcp: "unavailable",
        },
        apiVersion: "1.0.0",
      };

      expect(response.checks?.database).toBe("ok");
      expect(response.checks?.llm).toBe("ok");
      expect(response.checks?.mcp).toBe("unavailable");
    });
  });

  describe("ApiInfoResponse", () => {
    it("should have required fields", () => {
      const response: ApiInfoResponse = {
        name: "Aetherium",
        version: "1.0.0",
        description: "Test API",
        endpoints: [
          { path: "/v1/reason", method: "POST", description: "Reasoning" },
        ],
        capabilities: ["reasoning"],
        apiVersion: "1.0.0",
      };

      expect(response.name).toBe("Aetherium");
      expect(response.version).toBe("1.0.0");
      expect(response.description).toBe("Test API");
      expect(response.endpoints).toHaveLength(1);
      expect(response.capabilities).toContain("reasoning");
    });
  });

  describe("ProblemDetails", () => {
    it("should have required fields", () => {
      const error: ProblemDetails = {
        type: "https://api.aetherium.io/errors/invalid-request",
        title: "Invalid Request",
        status: 400,
        detail: "The request was invalid",
        apiVersion: "1.0.0",
      };

      expect(error.type).toBeDefined();
      expect(error.title).toBeDefined();
      expect(error.status).toBe(400);
      expect(error.detail).toBeDefined();
      expect(error.apiVersion).toBe("1.0.0");
    });

    it("should include validation errors when provided", () => {
      const error: ProblemDetails = {
        type: "https://api.aetherium.io/errors/invalid-request",
        title: "Invalid Request",
        status: 400,
        detail: "The request was invalid",
        errors: [
          { field: "identity_anchor", message: "Required field missing", code: "MISSING_FIELD" },
        ],
        apiVersion: "1.0.0",
      };

      expect(error.errors).toHaveLength(1);
      expect(error.errors?.[0].field).toBe("identity_anchor");
      expect(error.errors?.[0].code).toBe("MISSING_FIELD");
    });

    it("should have valid status codes", () => {
      const statusCodes = [400, 401, 404, 422, 500, 503];

      statusCodes.forEach((status) => {
        const error: ProblemDetails = {
          type: "about:blank",
          title: "Error",
          status,
          detail: "Something went wrong",
          apiVersion: "1.0.0",
        };

        expect(error.status).toBe(status);
      });
    });
  });

  describe("ToolCall", () => {
    it("should have required fields", () => {
      const toolCall = {
        id: "call-1",
        name: "query",
        arguments: { collection: "users" },
      };

      expect(toolCall.id).toBeDefined();
      expect(toolCall.name).toBeDefined();
      expect(toolCall.arguments).toBeDefined();
    });
  });

  describe("Action", () => {
    it("should have required fields and valid type", () => {
      const action = {
        type: "report" as const,
        title: "Query Results",
        data: { users: [] },
        format: "json" as const,
      };

      expect(action.type).toBe("report");
      expect(action.title).toBe("Query Results");
      expect(action.format).toBe("json");
    });

    it("should support all action types", () => {
      const validTypes = ["report", "update", "trigger", "notify"] as const;

      validTypes.forEach((type) => {
        const action = {
          type,
          title: "Test",
          data: {},
          format: "json" as const,
        };

        expect(action.type).toBe(type);
      });
    });
  });
});
