/**
 * Identity Types
 * 
 * Core type definitions for the Sigil identity system.
 * These types define the shape of identity documents stored in MongoDB
 * and the API contracts for identity CRUD operations.
 */

/**
 * A single immutable snapshot of an identity at a specific version.
 */
export interface IdentityVersion {
  /** Sequential version number (1, 2, 3, ...) */
  version: number;
  /** ISO 8601 timestamp when this version was created */
  timestamp: string;
  /** Full identity state at this version */
  state: SigilIdentity;
}

/**
 * Core identity document — the canonical representation of a developer's identity.
 */
export interface SigilIdentity {
  /** Unique identifier (ULID or UUID) */
  id: string;
  /** Human-readable identity name (e.g., "Aether's Developer") */
  name: string;
  /** Developer identifier (e.g., email or username) */
  developerId: string;
  /** Canonical sigil hash — deterministically generated from identity fields */
  sigilHash: string;
  /** Identity version number (incremented on each update) */
  version: number;
  /** Identity configuration and preferences */
  config: IdentityConfig;
  /** Immutable version history */
  versions: IdentityVersion[];
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last-update timestamp */
  updatedAt: string;
}

/**
 * Identity configuration — preferences that affect reasoning behavior.
 */
export interface IdentityConfig {
  /** Preferred LLM provider */
  preferredProvider?: string;
  /** Default temperature for generation */
  defaultTemperature?: number;
  /** Maximum tokens per request */
  maxTokens?: number;
  /** Memory retrieval parameters */
  memorySettings?: {
    alpha?: number;
    k?: number;
  };
  /** Custom rules/constraints for reflective layer */
  customRules?: string[];
  /** Additional metadata */
  [key: string]: any;
}

/**
 * Request to create a new identity.
 */
export interface IdentityCreateRequest {
  name: string;
  developerId: string;
  config?: IdentityConfig;
}

/**
 * Request to update an existing identity.
 */
export interface IdentityUpdateRequest {
  name?: string;
  config?: IdentityConfig;
}

/**
 * API response wrapper for identity operations.
 */
export interface IdentityResponse {
  identity: SigilIdentity;
  apiVersion: string;
}

/**
 * API response wrapper for listing identities.
 */
export interface IdentityListResponse {
  identities: SigilIdentity[];
  count: number;
  apiVersion: string;
}

/**
 * API response wrapper for version history.
 */
export interface IdentityVersionHistoryResponse {
  identityId: string;
  versions: IdentityVersion[];
  count: number;
  apiVersion: string;
}
