import express from "express";
import { MemoryService } from "../services/memory-service";

export function createMemoryRouter(memoryService: MemoryService) {
  const router = express.Router();

  router.get("/v1/memory/all", async (req, res) => {
    try {
      const docs = await memoryService.getAll();
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
    }
  });

  router.get("/v1/memory/trace", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }
      const embedding = await memoryService.embedQuery(query);
      const results = await memoryService.vectorSearch(embedding, 0.7, 10);
      res.json({ embedding, results });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
    }
  });

  return router;
}
