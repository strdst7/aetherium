import { Request, Response, Router } from 'express';
import { MultiAgentOrchestrator } from '../services/multi-agent-orchestrator';
import { IdentityBindingService } from '../services/identity-binding';
import { SovereignHaloService } from '../services/sovereign-halo';

/**
 * Creates and configures the Express router for the multi-agent endpoint.
 * 
 * @param multiAgentOrchestrator The configured MultiAgentOrchestrator instance
 * @param identityBinding Optional IdentityBindingService for early resolution
 * @returns Express Router
 */
export const createMultiAgentRouter = (
  multiAgentOrchestrator: MultiAgentOrchestrator,
  identityBinding?: IdentityBindingService
): Router => {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    try {
      const { query, identity_anchor } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'query is required and must be a string' });
      }

      if (!identity_anchor || typeof identity_anchor !== 'string') {
        return res.status(400).json({ error: 'identity_anchor is required and must be a string' });
      }

      // Early resolution to catch 404s before starting the heavy council flow
      if (identityBinding) {
        await identityBinding.resolveOrThrow(identity_anchor);
      }

      // Execute the multi-agent council flow
      const result = await multiAgentOrchestrator.runFlow(query, identity_anchor);
      
      // Format response to match expected API contract, including validation reports
      res.status(200).json({
        id: `mac-${Date.now()}`,
        text: result.narrator.output,
        trace: {
          identity: identity_anchor,
          archivist: result.archivist,
          sigilKeeper: result.sigilKeeper,
          narrator: result.narrator
        },
        identity: result.identity
      });
    } catch (error: any) {
      console.error(`[MultiAgentController] Error:`, error);
      if (error.code === 'IDENTITY_NOT_FOUND') {
        res.status(404).json({ error: error.message, type: 'ProblemDetails' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  return router;
};
