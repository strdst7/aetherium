import { AgentBuilder } from "./agent-builder";
import { Orchestrator } from "./orchestrator";
import { MCPClient } from "./mcp-client";
import { ReasonRequest } from "../controllers/reason";

jest.mock("./orchestrator");
jest.mock("./mcp-client");

describe("AgentBuilder", () => {
  let mockOrchestrator: jest.Mocked<Orchestrator>;
  let mockMCPClient: jest.Mocked<MCPClient>;
  let agentBuilder: AgentBuilder;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrchestrator = {
      process: jest.fn().mockResolvedValue({
        id: "test-id",
        text: "Test response",
        context: {
          selectedProvider: "gemini",
          relevantMemories: [],
        },
      }),
      processWithTools: jest.fn().mockResolvedValue({
        id: "test-id",
        text: "Tool response",
        context: {
          selectedProvider: "gemini",
          relevantMemories: [],
        },
        toolCalls: [],
      }),
    } as any;

    mockMCPClient = {
      start: jest.fn().mockResolvedValue(undefined),
      discoverTools: jest.fn().mockResolvedValue([
        { name: "echo", description: "Echo input", parameters: {} },
      ]),
      executeTool: jest.fn().mockResolvedValue({ success: true, data: "hello" }),
      isHealthy: jest.fn().mockReturnValue(true),
      stop: jest.fn().mockResolvedValue(undefined),
    } as any;

    agentBuilder = new AgentBuilder(mockOrchestrator, mockMCPClient, {
      enableTools: true,
      maxToolIterations: 5,
    });
  });

  describe("initialize", () => {
    it("should discover tools from MCP client", async () => {
      await agentBuilder.initialize();
      expect(mockMCPClient.start).toHaveBeenCalled();
      expect(mockMCPClient.discoverTools).toHaveBeenCalled();
    });

    it("should handle MCP client failure gracefully", async () => {
      mockMCPClient.start.mockRejectedValueOnce(new Error("Connection failed"));
      await agentBuilder.initialize();
      expect(mockMCPClient.start).toHaveBeenCalled();
      expect(mockMCPClient.discoverTools).not.toHaveBeenCalled();
    });
  });

  describe("execute", () => {
    it("should return standard response when tools are disabled", async () => {
      const req: ReasonRequest = {
        identity_anchor: "test",
        messages: [{ role: "user", content: "hello" }],
      };

      const result = await agentBuilder.execute(req, { enableTools: false });

      expect(result.response.output).toBe("Test response");
      expect(result.toolCalls).toBeUndefined();
      expect(mockOrchestrator.process).toHaveBeenCalled();
    });

    it("should return standard response when MCP client is unhealthy", async () => {
      mockMCPClient.isHealthy.mockReturnValue(false);
      const req: ReasonRequest = {
        identity_anchor: "test",
        messages: [{ role: "user", content: "hello" }],
      };

      const result = await agentBuilder.execute(req, { enableTools: true });

      expect(result.response.output).toBe("Test response");
      expect(mockOrchestrator.process).toHaveBeenCalled();
    });

    it("should execute tool-enabled reasoning when tools are available", async () => {
      await agentBuilder.initialize();

      mockOrchestrator.processWithTools.mockResolvedValueOnce({
        id: "test-id",
        text: "Tool response",
        context: {
          identity_anchor: "test",
          queryEmbedding: [],
          relevantMemories: [],
          systemPrompt: "",
          fullPrompt: "",
          selectedProvider: "gemini",
        },
        toolCalls: [{ id: "1", name: "echo", arguments: { message: "hello" } }],
      });

      const req: ReasonRequest = {
        identity_anchor: "test",
        messages: [{ role: "user", content: "hello" }],
      };

      const result = await agentBuilder.execute(req, { enableTools: true });

      expect(mockOrchestrator.processWithTools).toHaveBeenCalled();
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls![0].name).toBe("echo");
    });
  });

  describe("shutdown", () => {
    it("should stop MCP client", async () => {
      await agentBuilder.shutdown();
      expect(mockMCPClient.stop).toHaveBeenCalled();
    });
  });
});
