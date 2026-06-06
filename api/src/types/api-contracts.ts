/**
 * API Contract Types
 * 
 * TypeScript type definitions derived from and aligned with api/openapi.yml.
 * These types provide compile-time guarantees for API contracts.
 */

export type ApiVersion = "1.0.0";

export const CURRENT_API_VERSION: ApiVersion = "1.0.0";

export interface VersionedResponse {
  apiVersion: ApiVersion;
}

export interface Message {
  role: "user" | "system" | "assistant";
  content: string;
}

export interface ReasonOptions {
  maxTokens?: number;
  temperature?: number;
  policy?: Record<string, any>;
  memoryAlpha?: number;
  memoryK?: number;
  skipReflection?: boolean;
  enableTools?: boolean;
  mode?: "tool" | "task";
  maxToolIterations?: number;
  maxTaskIterations?: number;
}

export interface ReasonRequest {
  identity_anchor: string;
  messages: Message[];
  options?: ReasonOptions;
}

export interface MemoryResult {
  id: string;
  score: number;
  excerpt: string;
}

export interface OrchestratorReasoning {
  selectedProvider: string;
  relevantMemoriesCount: number;
  topMemories: MemoryResult[];
}

export interface Violation {
  rule: string;
  severity: string;
  message: string;
}

export interface ReflectiveCheckResult {
  status: "approved" | "refine" | "reject";
  violations: Violation[];
  suggestedConstraints: string[];
  confidenceScore: number;
}

export interface ReasoningTrace {
  stage: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface ReasoningPayload {
  orchestrator: OrchestratorReasoning;
  reflective: ReflectiveCheckResult;
  trace: ReasoningTrace[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

export interface ToolExecutionTrace {
  step: number;
  toolCall: ToolCall;
  result: ToolExecutionResult;
  timestamp: string;
}

export type PlanStatus = "pending" | "in_progress" | "completed" | "partial" | "failed";

export interface PlanStep {
  stepNumber: number;
  tool: string;
  args: Record<string, any>;
  expectedResult?: string;
  status?: "pending" | "in_progress" | "completed" | "failed";
  retryCount?: number;
}

export interface TaskPlan {
  steps: PlanStep[];
  description: string;
  estimatedSteps: number;
}

export type ActionType = "report" | "update" | "trigger" | "notify";

export interface Action {
  type: ActionType;
  title: string;
  data: Record<string, any>;
  format: "json" | "string" | "markdown" | "html";
}

export interface ResponseMetadata {
  processingTimeMs?: number;
  version?: string;
  mode?: "tool" | "task";
  error?: string;
  [key: string]: any;
}

export interface ReasonResponse extends VersionedResponse {
  id: string;
  output: string;
  status: "approved" | "refine" | "reject";
  identity_anchor: string;
  reasoning: ReasoningPayload;
  toolCalls?: ToolCall[];
  toolResults?: ToolExecutionResult[];
  toolExecutionTrace?: ToolExecutionTrace[];
  plan?: TaskPlan;
  actions?: Action[];
  planStatus?: PlanStatus;
  metadata?: ResponseMetadata;
}

export interface HealthResponse extends VersionedResponse {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  version?: string;
  uptime?: number;
  checks?: {
    database?: "ok" | "error";
    llm?: "ok" | "error";
    mcp?: "ok" | "error" | "unavailable";
  };
}

export interface ApiEndpoint {
  path: string;
  method: string;
  description: string;
}

export interface ApiInfoResponse extends VersionedResponse {
  name: string;
  version: string;
  description: string;
  endpoints: ApiEndpoint[];
  capabilities: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ProblemDetails extends VersionedResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: ValidationError[];
}

// Re-export identity types for downstream consumers
export {
  SigilIdentity,
  IdentityVersion,
  IdentityConfig,
  IdentityCreateRequest,
  IdentityUpdateRequest,
  IdentityResponse,
  IdentityListResponse,
  IdentityVersionHistoryResponse,
} from "./identity";

// Re-export halo types for downstream consumers
export {
  ValidationRule,
  ValidationCheck,
  ValidationReport,
  FailureReport,
  ToneDeviationCheck,
  SymbolicDriftCheck,
  HaloValidationOptions,
  DEFAULT_HALO_OPTIONS,
  MAX_HALO_ATTEMPTS,
  computeConfidenceScore,
} from "./halo";

// Re-export audit types for downstream consumers
export {
  AuditRecord,
  AuditRecordCreate,
  AuditQuery,
  AuditPagination,
  AuditProvenance,
  AuditListResponse,
} from "./audit";
