import { Orchestrator, OrchestratorRequest, OrchestratorResponse } from "../services/orchestrator";
import { ReflectiveService, ReflectiveCheckResult } from "../services/reflective-service";

export interface ReasonRequest {
  identity_anchor: string;
  messages: Array<{ role: string; content: string }>;
  options?: {
    maxTokens?: number;
    temperature?: number;
    policy?: string;
    memoryAlpha?: number;
    memoryK?: number;
    skipReflection?: boolean;
  };
}

export interface ReasoningTrace {
  stage: string;
  timestamp: string;
  details: any;
}

export interface ReasonResponse {
  id: string;
  output: string;
  status: "approved" | "refine" | "reject";
  identity_anchor: string;
  reasoning: {
    orchestrator: {
      selectedProvider: string;
      relevantMemoriesCount: number;
      topMemories: Array<{ id: string; score: number; excerpt: string }>;
    };
    reflective: ReflectiveCheckResult;
    trace: ReasoningTrace[];
  };
  metadata?: any;
}

export class ReasonController {
  private orchestrator: Orchestrator;
  private reflectiveService: ReflectiveService;

  constructor(orchestrator: Orchestrator, reflectiveService: ReflectiveService) {
    this.orchestrator = orchestrator;
    this.reflectiveService = reflectiveService;
  }

  async handleReason(req: ReasonRequest): Promise<ReasonResponse> {
    const trace: ReasoningTrace[] = [];
    const startTime = Date.now();

    try {
      // Validate input
      trace.push({
        stage: "validation",
        timestamp: new Date().toISOString(),
        details: { identity_anchor: req.identity_anchor, messageCount: req.messages.length },
      });

      this.validateRequest(req);

      // Step 1: Call orchestrator
      trace.push({
        stage: "orchestrator_start",
        timestamp: new Date().toISOString(),
        details: {
          policy: req.options?.policy || "highest-priority",
          memoryK: req.options?.memoryK || 5,
        },
      });

      const orchestratorReq: OrchestratorRequest = {
        identity_anchor: req.identity_anchor,
        messages: req.messages,
        maxTokens: req.options?.maxTokens || 512,
        temperature: req.options?.temperature || 0.7,
        policy: req.options?.policy as any,
        memoryAlpha: req.options?.memoryAlpha || 0.5,
        memoryK: req.options?.memoryK || 5,
      };

      const orchestratorResponse = await this.orchestrator.process(orchestratorReq);

      trace.push({
        stage: "orchestrator_complete",
        timestamp: new Date().toISOString(),
        details: {
          selectedProvider: orchestratorResponse.context.selectedProvider,
          relevantMemoriesCount: orchestratorResponse.context.relevantMemories.length,
          candidateLength: orchestratorResponse.text.length,
        },
      });

      // Step 2: Call reflective service
      trace.push({
        stage: "reflective_check_start",
        timestamp: new Date().toISOString(),
        details: null,
      });

      let reflectiveResult: ReflectiveCheckResult;
      if (req.options?.skipReflection) {
        reflectiveResult = {
          status: "approved",
          violations: [],
          suggestedConstraints: [],
          confidenceScore: 1.0,
        };
      } else {
        reflectiveResult = await this.reflectiveService.check(
          orchestratorResponse.text,
          orchestratorResponse.context
        );
      }

      trace.push({
        stage: "reflective_check_complete",
        timestamp: new Date().toISOString(),
        details: {
          status: reflectiveResult.status,
          violationCount: reflectiveResult.violations.length,
          confidenceScore: reflectiveResult.confidenceScore,
        },
      });

      // Step 3: Build response
      const topMemories = orchestratorResponse.context.relevantMemories.slice(0, 3).map((m) => ({
        id: m.doc.id || m.doc._id || "unknown",
        score: m.score,
        excerpt: m.doc.content.substring(0, 150),
      }));

      const response: ReasonResponse = {
        id: orchestratorResponse.id,
        output: orchestratorResponse.text,
        status: reflectiveResult.status,
        identity_anchor: req.identity_anchor,
        reasoning: {
          orchestrator: {
            selectedProvider: orchestratorResponse.context.selectedProvider,
            relevantMemoriesCount: orchestratorResponse.context.relevantMemories.length,
            topMemories,
          },
          reflective: reflectiveResult,
          trace,
        },
        metadata: {
          processingTimeMs: Date.now() - startTime,
          version: "1.0",
        },
      };

      trace.push({
        stage: "response_complete",
        timestamp: new Date().toISOString(),
        details: {
          totalProcessingTimeMs: response.metadata.processingTimeMs,
        },
      });

      return response;
    } catch (error) {
      trace.push({
        stage: "error",
        timestamp: new Date().toISOString(),
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  private validateRequest(req: ReasonRequest): void {
    if (!req.identity_anchor || typeof req.identity_anchor !== "string") {
      throw new Error("identity_anchor is required and must be a string");
    }

    if (!Array.isArray(req.messages) || req.messages.length === 0) {
      throw new Error("messages array is required and must not be empty");
    }

    for (const msg of req.messages) {
      if (!msg.role || !msg.content) {
        throw new Error("Each message must have 'role' and 'content' fields");
      }
    }

    if (req.options?.maxTokens && req.options.maxTokens < 1) {
      throw new Error("maxTokens must be greater than 0");
    }

    if (req.options?.temperature && (req.options.temperature < 0 || req.options.temperature > 2)) {
      throw new Error("temperature must be between 0 and 2");
    }

    if (req.options?.memoryK && req.options.memoryK < 1) {
      throw new Error("memoryK must be greater than 0");
    }

    if (req.options?.memoryAlpha && (req.options.memoryAlpha < 0 || req.options.memoryAlpha > 1)) {
      throw new Error("memoryAlpha must be between 0 and 1");
    }
  }
}

// Express middleware factory
export function createReasonRouter(
  orchestrator: Orchestrator,
  reflectiveService: ReflectiveService
) {
  const controller = new ReasonController(orchestrator, reflectiveService);

  return async (req: any, res: any, next: any) => {
    try {
      const input: ReasonRequest = req.body;
      const response = await controller.handleReason(input);
      res.status(200).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      res.status(400).json({
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  };
}
