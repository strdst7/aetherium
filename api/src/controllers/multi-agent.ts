import express from "express";
import { MultiAgentOrchestrator } from "../services/multi-agent-orchestrator";

export function createMultiAgentRouter(orchestrator: MultiAgentOrchestrator) {
  const router = express.Router();

  router.post("/v1/multi-agent", async (req, res) => {
    try {
      const { identity_anchor, prompt } = req.body;
      if (!identity_anchor || typeof identity_anchor !== "string" || identity_anchor.trim().length === 0) {
        return res.status(400).json({ error: "identity_anchor must be a non-empty string" });
      }
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "prompt must be a string" });
      }
      const result = await orchestrator.runFlow(prompt, identity_anchor);
      res.json(result);
    } catch (error) {
      console.error("[MultiAgent] Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
    }
  });

  return router;
}
