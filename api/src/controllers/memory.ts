import express from "express";
import { MemoryService } from "../services/memory-service";

export function createMemoryRouter(memoryService: MemoryService) {
  const router = express.Router();

  router.get("/v1/memory/all", async (req, res) => {
    try {
      const { identityId } = req.query;
      let docs;
      if (identityId && typeof identityId === "string") {
        docs = await memoryService.searchByMetadata({ identityId });
      } else {
        docs = await memoryService.getAll();
      }
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
    }
  });

  router.get("/v1/memory/trace", async (req, res) => {
    try {
      const { query, identityId } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }
      const embedding = await memoryService.embedQuery(query);
      const results = await memoryService.vectorSearch(embedding, 0.7, 10);
      // If identityId is provided, filter results to identity-scoped shards
      let filteredResults = results;
      if (identityId && typeof identityId === "string") {
        filteredResults = results.filter((r) => {
          const metadata = (r as any).doc?.metadata || (r as any).metadata || {};
          return metadata.identityId === identityId || metadata.sigil === identityId;
        });
      }
      res.json({ embedding, results: filteredResults });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
    }
  });

  return router;
}
