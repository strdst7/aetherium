/**
 * Audit & Immutability Types
 * 
 * Defines the audit trail type system — records, queries, pagination,
 * and provenance tracking for every identity-bound generation.
 */

import { ValidationReport } from "./halo";

export interface AuditProvenance {
  /** The raw LLM output before any transformation */
  originalOutput: string;
  /** Mythic transformations applied by MythicModule */
  mythifyTransformations?: string[];
  /** Validation results from Sovereign Halo */
  validationReport?: ValidationReport;
  /** Number of regeneration attempts */
  regenerationAttempts?: number;
  /** Memory shards used in generation */
  memoryShards?: Array<{ id: string; excerpt: string; score: number }>;
  /** Which provider generated the output */
  providerName: string;
  /** Model identifier */
  modelVersion?: string;
}

export interface AuditRecord {
  /** Unique record identifier (UUID v4) */
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
  /** Reasoning trace from the generation */
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

export interface AuditRecordCreate {
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
  /** Reasoning trace from the generation */
  reasoningTrace?: any;
  /** Validation report if validation was performed */
  validationReport?: ValidationReport;
  /** Generation chain details */
  provenance: AuditProvenance;
  /** Optional extra metadata */
  metadata?: Record<string, any>;
}

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
  sort?: "asc" | "desc";
}

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

export interface AuditListResponse {
  /** Audit records */
  records: AuditRecord[];
  /** Pagination metadata */
  pagination: AuditPagination;
  /** API version */
  apiVersion: string;
}
