import express from "express";
import { MemoryService } from "./services/memory-service";
import { ProviderRegistry } from "./services/provider-registry";
import { Orchestrator } from "./services/orchestrator";
import { ReflectiveService } from "./services/reflective-service";
import { ReasonController } from "./controllers/reason";
import { registerProviders } from "./bootstrap/providers";
import { createMemoryRouter } from "./controllers/memory";
import { MultiAgentOrchestrator } from "./services/multi-agent-orchestrator";
import { createMultiAgentRouter } from "./controllers/multi-agent";
import failoverRouter from "./controllers/failover";
import { MCPClient } from "./services/mcp-client";
import { AgentBuilder } from "./services/agent-builder";
import { versionNegotiation, addVersionToResponse } from "./middleware/version-negotiation";
import { errorHandler } from "./middleware/error-handler";
import { createDocsRouter } from "./routes/docs";
import { createHealthRouter } from "./routes/health";

const app = express();
const PORT = process.env.API_PORT || 8080;

// Middleware
app.use(express.json());
app.use("/", failoverRouter);

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept-Version, X-API-Version");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Version negotiation middleware
app.use(versionNegotiation);
app.use(addVersionToResponse);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Initialize services
async function bootstrap() {
  try {
    // Initialize memory service
    const memoryService = new MemoryService();
    await memoryService.connect(process.env.MONGODB_URI);
    console.log("✅ Memory service connected");

    // Initialize provider registry via bootstrap
    const { geminiProvider, ollamaProvider } = await registerProviders();
    const ollamaHealth = await ollamaProvider.healthCheck();
    const geminiHealth = await geminiProvider.healthCheck();
    console.log(`🔮 Gemini provider health: ${geminiHealth.ok ? "healthy" : "unavailable (API key may be missing)"}`);
    console.log(`⚠️  Ollama provider health: ${ollamaHealth.ok ? "healthy" : "unavailable (using mock fallback)"}`);
    console.log("✅ Providers registered");

    // Initialize orchestrator
    const registry = ProviderRegistry.instance;
    const orchestrator = new Orchestrator(memoryService, registry);
    console.log("✅ Orchestrator initialized");

    // Initialize reflective service
    const reflectiveService = new ReflectiveService();
    console.log("✅ Reflective service initialized");

    // Initialize MCP client
    const mcpClient = new MCPClient(process.env.MCP_SERVER_PATH);
    try {
      await mcpClient.start();
      console.log("✅ MCP client connected");
    } catch (error) {
      console.warn("⚠️ MCP client failed to start:", error instanceof Error ? error.message : String(error));
    }

    // Initialize AgentBuilder
    const agentBuilder = new AgentBuilder(orchestrator, mcpClient, {
      enableTools: true,
      maxToolIterations: 5,
      maxTaskIterations: 20,
    });
    await agentBuilder.initialize();
    console.log("✅ AgentBuilder initialized");

    // Log MCP server status
    const mcpHealth = mcpClient.isHealthy();
    console.log(`🔧 MCP server: ${mcpHealth ? "connected" : "unavailable (tool-use disabled)"}`);

    // Register memory visualization endpoints
    app.use("/", createMemoryRouter(memoryService));
    console.log("✅ Memory visualization routes registered");

    // Initialize multi-agent orchestrator
    const multiAgentOrchestrator = new MultiAgentOrchestrator(memoryService, reflectiveService);
    app.use("/", createMultiAgentRouter(multiAgentOrchestrator));
    console.log("✅ Multi-agent routes registered");

    // Register reason endpoint
    const reasonController = new ReasonController(orchestrator, reflectiveService, agentBuilder);
    app.post("/v1/reason", async (req, res) => {
      try {
        const response = await reasonController.handleReason(req.body);
        res.json(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        res.status(400).json({
          error: message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Register health and API info endpoints
    app.use("/", createHealthRouter({
      memoryService,
      providerRegistry: registry,
      mcpClient,
    }));
    console.log("✅ Health and info routes registered");

    // Register documentation routes
    app.use("/", createDocsRouter());
    console.log("✅ Documentation routes registered");

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("Shutting down gracefully...");
      await mcpClient.stop();
      process.exit(0);
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 API server running on http://0.0.0.0:${PORT}`);
      console.log(`📝 Reasoning endpoint: POST /v1/reason`);
      console.log(`❤️  Health check: GET /health`);
      console.log(`\n💡 Using: ${ollamaHealth.ok ? "Ollama (live)" : "Mock provider (for testing)\n   Note: Ollama will take over once models finish downloading"}\n`);
    });
  } catch (error) {
    console.error("❌ Bootstrap failed:", error);
    process.exit(1);
  }
}

bootstrap();
