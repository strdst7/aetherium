import { Router } from "express";
import path from "path";

/**
 * Creates routes for API documentation.
 * 
 * - /docs - Interactive Swagger UI
 * - /openapi.yml - Raw OpenAPI spec
 */
export function createDocsRouter(): Router {
  const router = Router();

  // Serve raw OpenAPI spec
  router.get("/openapi.yml", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../../openapi.yml"));
  });

  // Serve interactive Swagger UI (if swagger-ui-express is available)
  router.get("/docs", async (req, res, next) => {
    try {
      // Dynamically import swagger-ui-express to avoid hard dependency
      const swaggerUi = await import("swagger-ui-express");
      const swaggerDocument = require("../../openapi.yml");
      
      const setupHandler = swaggerUi.setup(swaggerDocument);
      setupHandler(req, res, next);
    } catch (error) {
      // Fallback: Serve a simple HTML page with links
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Aetherium API Documentation</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
              h1 { color: #333; }
              a { color: #0066cc; text-decoration: none; }
              a:hover { text-decoration: underline; }
              .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; }
              code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <h1>Aetherium API Documentation</h1>
            <p>Version: 1.0.0</p>
            
            <h2>Resources</h2>
            <div class="endpoint">
              <strong>OpenAPI Specification</strong><br>
              <a href="/openapi.yml">/openapi.yml</a>
            </div>
            
            <h2>Endpoints</h2>
            <div class="endpoint">
              <code>POST /v1/reason</code> - Natural language reasoning
            </div>
            <div class="endpoint">
              <code>GET /health</code> - Health check
            </div>
            <div class="endpoint">
              <code>GET /v1/info</code> - API information
            </div>
            
            <p><em>Install swagger-ui-express for interactive documentation:</em><br>
            <code>npm install swagger-ui-express @types/swagger-ui-express</code></p>
          </body>
        </html>
      `);
    }
  });

  return router;
}
