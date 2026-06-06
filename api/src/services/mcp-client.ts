import { spawn, ChildProcess } from "child_process";

export type MCPTool = {
  name: string;
  description: string;
  parameters?: Record<string, any>;
};

export type MCPSchema = {
  tools: MCPTool[];
  collections?: string[];
};

export type ToolExecutionResult = {
  success: boolean;
  data?: any;
  error?: string;
};

export type MCPRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: any;
};

export type MCPResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: any;
  error?: { code: number; message: string };
};

/**
 * MCPClient connects to an MCP server via stdio transport.
 * Manages the server lifecycle and auto-discovers tools.
 */
export class MCPClient {
  private serverPath: string;
  private process?: ChildProcess;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (reason: any) => void }>();
  private discoveredTools: MCPTool[] = [];
  private restartAttempts = 0;
  private maxRestarts = 3;
  private isRunning = false;
  private shuttingDown = false;

  constructor(serverPath: string = process.env.MCP_SERVER_PATH || "") {
    this.serverPath = serverPath;
  }

  async start(): Promise<void> {
    if (!this.serverPath) {
      throw new Error("MCP_SERVER_PATH is not set");
    }

    if (this.isRunning && this.process && !this.process.killed) {
      return;
    }

    try {
      this.process = spawn(this.serverPath, [], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.process.stdout?.on("data", (data: Buffer) => {
        const lines = data.toString().trim().split("\n");
        for (const line of lines) {
          if (line.trim()) {
            this.handleResponse(line.trim());
          }
        }
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        console.error(`[MCP Server stderr]: ${data.toString().trim()}`);
      });

      this.process.on("exit", (code) => {
        console.log(`[MCP Server] exited with code ${code}`);
        this.isRunning = false;
        this.handleCrash();
      });

      this.process.on("error", (error) => {
        console.error(`[MCP Server] error: ${error.message}`);
        this.isRunning = false;
      });

      this.isRunning = true;
      this.restartAttempts = 0;

      // Wait a moment for the server to start
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      this.isRunning = false;
      throw new Error(`Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async discoverTools(): Promise<MCPTool[]> {
    if (!this.isHealthy()) {
      throw new Error("MCP server is not healthy");
    }

    const response = await this.sendRequest("discover", {});
    this.discoveredTools = response?.tools || [];
    return this.discoveredTools;
  }

  async executeTool(name: string, args: Record<string, any>): Promise<ToolExecutionResult> {
    if (!this.isHealthy()) {
      return { success: false, error: "MCP server is not healthy" };
    }

    try {
      const response = await this.sendRequest("execute", { name, arguments: args });
      return {
        success: response?.success ?? true,
        data: response?.data,
        error: response?.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** Returns the full schema of discovered tools. Available for external consumers. */
  getSchema(): MCPSchema {
    return {
      tools: this.discoveredTools,
    };
  }

  isHealthy(): boolean {
    return this.isRunning && this.process !== undefined && !this.process.killed;
  }

  async stop(): Promise<void> {
    this.shuttingDown = true;
    if (this.process && !this.process.killed) {
      this.process.kill("SIGTERM");
      // Wait for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!this.process.killed) {
        this.process.kill("SIGKILL");
      }
    }
    this.isRunning = false;
    this.process = undefined;
  }

  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin || this.process.killed) {
        reject(new Error("MCP server process is not available"));
        return;
      }

      this.requestId++;
      const request: MCPRequest = {
        jsonrpc: "2.0",
        id: this.requestId,
        method,
        params,
      };

      this.pendingRequests.set(this.requestId, { resolve, reject });

      this.process.stdin.write(JSON.stringify(request) + "\n");
    });
  }

  private handleResponse(line: string): void {
    try {
      const response: MCPResponse = JSON.parse(line);
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        this.pendingRequests.delete(response.id);
        if (response.error) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
      }
    } catch (error) {
      console.error(`[MCP Client] Failed to parse response: ${line}`);
    }
  }

  private handleCrash(): void {
    if (this.shuttingDown) return;
    if (this.restartAttempts < this.maxRestarts) {
      this.restartAttempts++;
      const delay = Math.pow(2, this.restartAttempts) * 1000; // Exponential backoff
      console.log(`[MCP Client] Restarting server in ${delay}ms (attempt ${this.restartAttempts}/${this.maxRestarts})`);
      setTimeout(() => {
        this.start().catch((error) => {
          console.error(`[MCP Client] Restart failed: ${error.message}`);
        });
      }, delay);
    } else {
      console.error(`[MCP Client] Max restart attempts reached. Server remains down.`);
    }
  }
}
