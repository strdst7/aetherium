import { ValidationReport } from './halo';

/**
 * Represents the chain of generation transformations for an audit record.
 */
export interface AuditProvenance {
  /** The raw LLM output before any transformation */
  originalOutput: string;
  /** Transformations applied by MythicModule */
  mythifyTransformations?: string[];
  /** Validation results from Sovereign Halo */
  validationReport?: ValidationReport;
  /** Number of regeneration attempts */
  regenerationAttempts?: number;
  /** Memories used during generation */
  memoryShards?: Array<{ id: string; excerpt: string; score: number }>;
  /** Which provider generated the output */
  providerName: string;
  /** Model identifier */
  modelVersion?: string;
}

/**
 * Represents an immutable audit record of a generation event.
 */
export interface AuditRecord {
  /** UUID v4 for unique identification */
  recordId: string;
  /** The identity this generation was for */
  identityId: string;
  /** Human-readable identity name */
  identityName: string;
  /** Identity version at time of generation */
  identityVersion: number;
  /** The full prompt sent to the LLM */
  prompt: string;
  /** The final output delivered to the user */
  output: string;
  /** The reasoning trace from the generation */
  reasoningTrace?: any;
  /** Validation report if validation was performed */
  validationReport?: ValidationReport;
  /** Generation chain details */
  provenance: AuditProvenance;
  /** ISO 8601 timestamp with millisecond precision */
  timestamp: string;
  /** SHA-256 hash of key fields for tamper detection */
  hash: string;
  /** Optional extra metadata */
  metadata?: Record<string, any>;
}

/**
 * Input for creating an audit record (omits auto-generated fields).
 */
export type AuditRecordCreate = Omit<AuditRecord, 'recordId' | 'timestamp' | 'hash'>;

/**
 * Query parameters for audit searches.
 */
export interface AuditQuery {
  /** Required identity filter */
  identityId: string;
  /** ISO 8601 start date */
  from?: string;
  /** ISO 8601 end date */
  to?: string;
  /** Max records to return (default 50, max 500) */
  limit?: number;
  /** Pagination offset (default 0) */
  offset?: number;
  /** Sort order (default 'desc') */
  sort?: 'asc' | 'desc';
}

/**
 * Pagination metadata in responses.
 */
export interface AuditPagination {
  /** Total matching records */
  total: number;
  /** Records per page */
  limit: number;
  /** Current offset */
  offset: number;
  /** Whether more records exist */
  hasMore: boolean;
}

/**
 * Response structure for audit queries.
 */
export interface AuditListResponse {
  records: AuditRecord[];
  pagination: AuditPagination;
  apiVersion: string;
}
