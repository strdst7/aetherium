import { MCPClient, MCPTool, ToolExecutionResult } from "./mcp-client";
import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";

jest.mock("child_process");

class MockReadable extends EventEmitter {
  on(event: string, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }
}

class MockWritable extends EventEmitter {
  write = jest.fn();
}

function createMockProcess(): ChildProcess {
  const stdout = new MockReadable();
  const stderr = new MockReadable();
  const stdin = new MockWritable();

  const process = new EventEmitter() as any;
  process.stdout = stdout;
  process.stderr = stderr;
  process.stdin = stdin;
  process.kill = jest.fn().mockImplementation(() => {
    process.killed = true;
  });
  process.killed = false;

  return process;
}

describe("MCPClient", () => {
  let client: MCPClient;
  let mockProcess: any;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new MCPClient("/path/to/mcp-server");

    mockProcess = createMockProcess();
    (spawn as jest.Mock).mockReturnValue(mockProcess);
  });

  describe("start", () => {
    it("should spawn the MCP server process", async () => {
      const startPromise = client.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await startPromise;

      expect(spawn).toHaveBeenCalledWith("/path/to/mcp-server", [], { stdio: ["pipe", "pipe", "pipe"] });
      expect(client.isHealthy()).toBe(true);
    });

    it("should throw when server path is not set", async () => {
      const emptyClient = new MCPClient("");
      await expect(emptyClient.start()).rejects.toThrow("MCP_SERVER_PATH is not set");
    });
  });

  describe("discoverTools", () => {
    it("should discover tools from the MCP server", async () => {
      const startPromise = client.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await startPromise;

      const discoverPromise = client.discoverTools();

      // Emit response asynchronously
      setTimeout(() => {
        const response = {
          jsonrpc: "2.0",
          id: 1,
          result: {
            tools: [
              { name: "echo", description: "Echo input", parameters: {} },
            ],
          },
        };
        mockProcess.stdout.emit("data", Buffer.from(JSON.stringify(response) + "\n"));
      }, 50);

      const tools = await discoverPromise;
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe("echo");
    });

    it("should throw when server is not healthy", async () => {
      await expect(client.discoverTools()).rejects.toThrow("MCP server is not healthy");
    });
  });

  describe("executeTool", () => {
    it("should execute a tool and return the result", async () => {
      const startPromise = client.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await startPromise;

      const executePromise = client.executeTool("echo", { message: "hello" });

      // Emit response asynchronously to simulate real server behavior
      setTimeout(() => {
        const response = {
          jsonrpc: "2.0",
          id: 1,
          result: { success: true, data: "hello" },
        };
        mockProcess.stdout.emit("data", Buffer.from(JSON.stringify(response) + "\n"));
      }, 50);

      const result = await executePromise;
      expect(result.success).toBe(true);
      expect(result.data).toBe("hello");
    });

    it("should return error when server is not healthy", async () => {
      const result = await client.executeTool("echo", { message: "hello" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("MCP server is not healthy");
    });
  });

  describe("stop", () => {
    it("should kill the server process", async () => {
      const startPromise = client.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await startPromise;

      await client.stop();
      expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
      expect(client.isHealthy()).toBe(false);
    });
  });
});
