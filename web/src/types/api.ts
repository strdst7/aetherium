/**
 * Shared TypeScript types for Aetherium API
 * 
 * Aligned with api/src/types/api-contracts.ts
 */

export interface SigilIdentity {
  id: string;
  name: string;
  developerId: string;
  sigilHash: string;
  version: number;
  config?: {
    customRules?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface IdentityVersion {
  version: number;
  sigilHash: string;
  config?: {
    customRules?: string[];
  };
  createdAt: string;
}

export interface IdentityCreateRequest {
  name: string;
  developerId: string;
  config?: {
    customRules?: string[];
  };
}

export interface ValidationRule {
  id: string;
  name: string;
  category: 'forbidden' | 'tone' | 'symbolic' | 'safety';
  weight: number;
}

export interface ValidationCheck {
  rule: ValidationRule;
  passed: boolean;
  detail: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface ValidationReport {
  status: 'passed' | 'failed';
  checks: ValidationCheck[];
  passedCount: number;
  failedCount: number;
  totalCount: number;
  confidenceScore: number;
  identityId: string;
  validatedAt: string;
  attemptNumber?: number;
}

export interface FailureReport {
  status: 'failed';
  attemptCount: number;
  violationSummary: string[];
  safeFallbackMessage: string;
  lastValidationReport: ValidationReport;
  identityId: string;
  generatedAt: string;
}

export interface MemoryDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  score?: number;
  createdAt?: string;
}

export interface ReasoningResponse {
  id: string;
  output: string;
  status: 'approved' | 'refine' | 'reject' | 'failed';
  identity_anchor: string;
  reasoning: {
    orchestrator: {
      selectedProvider: string;
      relevantMemoriesCount: number;
      topMemories: Array<{ id: string; score: number; excerpt: string }>;
    };
    reflective: {
      status: string;
      violations: Array<{ type: string; severity: string; message: string }>;
      suggestedConstraints: Array<{ constraint: string; rationale: string }>;
      confidenceScore: number;
    };
    trace: Array<{ stage: string; timestamp: string; details: any }>;
  };
  validationReport?: ValidationReport;
  failureReport?: FailureReport;
  metadata?: {
    processingTimeMs?: number;
    version?: string;
    mode?: 'tool' | 'task';
    error?: string;
    refinedCandidate?: any;
  };
}

export interface ReasoningTrace {
  stage: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface OrchestratorReasoning {
  selectedProvider: string;
  relevantMemoriesCount: number;
  topMemories: Array<{ id: string; score: number; excerpt: string }>;
}

export interface ReflectiveCheckResult {
  status: 'approved' | 'refine' | 'reject';
  violations: Array<{ rule: string; severity: string; message: string }>;
  suggestedConstraints: string[];
  confidenceScore: number;
}

export interface AuditRecord {
  recordId: string;
  identityId: string;
  identityName: string;
  identityVersion: number;
  prompt: string;
  output: string;
  timestamp: string;
  hash: string;
  validationReport?: ValidationReport;
}

export interface AuditListResponse {
  records: AuditRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  apiVersion: string;
}
