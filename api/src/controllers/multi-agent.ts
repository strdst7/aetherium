import express from "express";
import { MultiAgentOrchestrator } from "../services/multi-agent-orchestrator";

export function createMultiAgentRouter(orchestrator: MultiAgentOrchestrator) {
  const router = express.Router();

  router.post("/v1/multi-agent", async (req, res) => {
    try {
      const { identity_anchor, prompt } = req.body;
      if (!identity_anchor || !prompt) {
        return res.status(400).json({ error: "identity_anchor and prompt are required" });
      }
      const result = await orchestrator.runFlow(prompt, identity_anchor);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
    }
  });

  return router;
}
