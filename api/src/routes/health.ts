import { Router } from "express";
import { HealthResponse, ApiInfoResponse } from "../types/api-contracts";
import { CURRENT_API_VERSION } from "../types/api-contracts";

/**
 * Creates routes for health checks and API information.
 */
export function createHealthRouter(
  options?: {
    memoryService?: any;
    providerRegistry?: any;
    mcpClient?: any;
  }
): Router {
  const router = Router();
  const startTime = Date.now();

  // Health check endpoint
  router.get("/health", async (req, res) => {
    const checks: HealthResponse["checks"] = {
      database: "ok",
      llm: "ok",
      mcp: "ok",
    };

    // Check database if memory service is provided
    if (options?.memoryService) {
      try {
        // Simple ping - if it fails, mark as error
        await options.memoryService.vectorSearch?.([0], 0.5, 1).catch(() => {
          checks.database = "error";
        });
      } catch {
        checks.database = "error";
      }
    }

    // Check LLM providers
    if (options?.providerRegistry) {
      try {
        const providers = options.providerRegistry.listProviders?.() || [];
        let healthy = false;
        for (const p of providers) {
          const result = await p.healthCheck?.();
          if (result && result.ok) {
            healthy = true;
            break;
          }
        }
        if (!healthy && providers.length > 0) {
          checks.llm = "error";
        }
      } catch {
        checks.llm = "error";
      }
    }

    // Check MCP client
    if (options?.mcpClient) {
      try {
        const isHealthy = options.mcpClient.isHealthy?.();
        if (!isHealthy) {
          checks.mcp = "unavailable";
        }
      } catch {
        checks.mcp = "error";
      }
    }

    const overallStatus = Object.values(checks).some(c => c === "error")
      ? "degraded"
      : "ok";

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: CURRENT_API_VERSION,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
      apiVersion: CURRENT_API_VERSION,
    };

    res.status(overallStatus === "ok" ? 200 : 503).json(response);
  });

  // API info endpoint
  router.get("/v1/info", (req, res) => {
    const response: ApiInfoResponse = {
      name: "Aetherium",
      version: CURRENT_API_VERSION,
      description: "Sovereign, identity-first AI intelligence platform",
      endpoints: [
        {
          path: "/v1/reason",
          method: "POST",
          description: "Natural language reasoning with tool support",
        },
        {
          path: "/v1/memory/search",
          method: "POST",
          description: "Memory vector search",
        },
        {
          path: "/health",
          method: "GET",
          description: "Health check",
        },
        {
          path: "/v1/info",
          method: "GET",
          description: "API information",
        },
        {
          path: "/docs",
          method: "GET",
          description: "API documentation",
        },
        {
          path: "/openapi.yml",
          method: "GET",
          description: "OpenAPI specification",
        },
      ],
      capabilities: [
        "reasoning",
        "tool-use",
        "task-mode",
        "memory",
        "identity",
        "multi-agent",
      ],
      apiVersion: CURRENT_API_VERSION,
    };

    res.json(response);
  });

  return router;
}
