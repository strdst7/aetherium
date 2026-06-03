import express from "express";
import { MemoryService } from "./services/memory-service";
import { ProviderRegistry } from "./services/provider-registry";
import { OllamaProvider } from "./adapters/ollama-provider";
import { MockProvider } from "./adapters/mock-provider";
import { Orchestrator } from "./services/orchestrator";
import { ReflectiveService } from "./services/reflective-service";
import { ReasonController } from "./controllers/reason";

const app = express();
const PORT = process.env.API_PORT || 8080;

// Middleware
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

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

    // Initialize provider registry
    const registry = new ProviderRegistry();
    
    // Health check Ollama first
    const ollamaProvider = new OllamaProvider(process.env.OLLAMA_URL);
    const ollamaHealth = await ollamaProvider.healthCheck();
    console.log(`⚠️  Ollama provider health: ${ollamaHealth.ok ? "healthy" : "unavailable (using mock fallback)"}`);

    // Register providers - use mock as primary, Ollama as secondary
    const mockProvider = new MockProvider();
    registry.register("mock", mockProvider, ollamaHealth.ok ? 50 : 100, ["embeddings"]);
    console.log("✅ Mock provider registered");
    
    registry.register("ollama", ollamaProvider, ollamaHealth.ok ? 100 : 0, ["embeddings"]);
    console.log("✅ Ollama provider registered");

    // Initialize orchestrator
    const orchestrator = new Orchestrator(memoryService, registry);
    console.log("✅ Orchestrator initialized");

    // Initialize reflective service
    const reflectiveService = new ReflectiveService();
    console.log("✅ Reflective service initialized");

    // Register reason endpoint
    const reasonController = new ReasonController(orchestrator, reflectiveService);
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
