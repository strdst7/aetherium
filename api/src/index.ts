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
import { validateRequestMiddleware, validateResponseMiddleware } from "./middleware/openapi-validator";
import { createDocsRouter } from "./routes/docs";
import { createHealthRouter } from "./routes/health";
import { IdentityService } from "./services/identity-service";
import { IdentityBindingService } from "./services/identity-binding";
import { IdentityConstraintEngine } from "./services/identity-constraints";
import { SymbolicAnchorLoader } from "./services/symbolic-anchor-loader";
import { MythicModule } from "./services/mythic-module";
import { SovereignHaloService } from "./services/sovereign-halo";
import { AuditService } from "./services/audit-service";
import { createAuditRouter } from "./controllers/audit";
import { createIdentityRouter } from "./controllers/identity";

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 8080;

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

// Initialize services
async function bootstrap() {
  try {
    // Initialize memory service
    const memoryService = new MemoryService();
    await memoryService.connect(process.env.MONGODB_URI);
    console.log("✅ Memory service connected");

    // Initialize identity service
    const identityService = new IdentityService();
    await identityService.connect(process.env.MONGODB_URI);
    console.log("✅ Identity service connected");

    // Initialize identity binding service
    const identityBinding = new IdentityBindingService(identityService);
    console.log("✅ Identity binding service initialized");

    // Initialize mythic module
    const anchorLoader = new SymbolicAnchorLoader();
    await anchorLoader.load();
    const mythicModule = new MythicModule(anchorLoader);
    console.log("✅ Mythic module initialized");

    // Initialize identity constraint engine (for Sovereign Halo)
    const constraintEngine = new IdentityConstraintEngine();
    console.log("✅ Identity constraint engine initialized");

    // Initialize Sovereign Halo
    const sovereignHalo = new SovereignHaloService(constraintEngine, mythicModule, {
      maxAttempts: 3,
      temperaturePenalty: 0.1,
      requireSymbolicAnchors: true,
      toneTolerance: 0.5,
      skipSafetyCheck: false,
    });
    console.log("✅ Sovereign Halo initialized");

    // Initialize provider registry via bootstrap
    const { geminiProvider, ollamaProvider } = await registerProviders();
    const ollamaHealth = await ollamaProvider.healthCheck();
    const geminiHealth = await geminiProvider.healthCheck();
    console.log(`🔮 Gemini provider health: ${geminiHealth.ok ? "healthy" : "unavailable (API key may be missing)"}`);
    console.log(`⚠️  Ollama provider health: ${ollamaHealth.ok ? "healthy" : "unavailable (using mock fallback)"}`);
    console.log("✅ Providers registered");

    // Initialize audit service
    const auditService = new AuditService();
    await auditService.connect(process.env.MONGODB_URI);
    console.log("✅ Audit service connected");

    // Initialize orchestrator (with identity binding, mythic module, sovereign halo, and audit service)
    const registry = ProviderRegistry.instance;
    const orchestrator = new Orchestrator(memoryService, registry, identityBinding, mythicModule, sovereignHalo, auditService);
    console.log("✅ Orchestrator initialized with identity binding, mythic module, sovereign halo, and audit service");

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
    const multiAgentOrchestrator = new MultiAgentOrchestrator(memoryService, reflectiveService, identityBinding, sovereignHalo);
    app.use("/", createMultiAgentRouter(multiAgentOrchestrator));
    console.log("✅ Multi-agent routes registered with Sovereign Halo");

    // Register audit routes
    app.use("/", createAuditRouter(auditService));
    console.log("✅ Audit routes registered");

    // Register reason endpoint
    const reasonController = new ReasonController(orchestrator, reflectiveService, agentBuilder);
    app.post("/v1/reason", validateRequestMiddleware, async (req, res, next) => {
      try {
        const response = await reasonController.handleReason(req.body);
        res.json(response);
      } catch (error) {
        next(error);
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

    // Register identity routes
    app.use("/v1", createIdentityRouter(identityService));
    console.log("✅ Identity routes registered");

    // Response validation middleware
    app.use(validateResponseMiddleware);

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
