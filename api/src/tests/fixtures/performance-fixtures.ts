/**
 * Performance test fixtures and scenario generators.
 *
 * Provides reusable performance scenarios for latency, concurrency,
 * and stress testing across the Aetherium pipeline.
 */

import { SigilIdentity } from "../../types/identity";
import {
  createIdentity,
  createIdentityBatch,
} from "./identity-factory";
import { OrchestratorRequest } from "../../services/orchestrator";

export interface PerformanceScenario {
  name: string;
  identities: SigilIdentity[];
  requests: OrchestratorRequest[];
  concurrentCount: number;
  description: string;
}

/**
 * Create a batch of distinct identities suitable for performance testing.
 * Each identity has a unique name and developerId based on index.
 */
export function createBatchIdentities(count: number): SigilIdentity[] {
  return Array.from({ length: count }, (_, i) =>
    createIdentity({
      name: `Perf Test Identity ${i + 1}`,
      developerId: `perf${i + 1}@test.com`,
    })
  );
}

/**
 * Build a standard OrchestratorRequest for a given identity anchor.
 */
function buildRequest(identityAnchor: string): OrchestratorRequest {
  return {
    identity_anchor: identityAnchor,
    messages: [
      {
        role: "user",
        content: "Explain quantum computing",
      },
    ],
  };
}

/**
 * Create a performance scenario with the specified number of identities
 * and requests.
 */
export function createPerformanceScenario(
  name: string,
  options?: {
    identityCount?: number;
    requestsPerIdentity?: number;
    concurrentCount?: number;
  }
): PerformanceScenario {
  const identityCount = options?.identityCount ?? 1;
  const requestsPerIdentity = options?.requestsPerIdentity ?? 1;
  const concurrentCount = options?.concurrentCount ?? 5;

  // Generate identities using the identity factory (offline / test-safe)
  const identities = createIdentityBatch(identityCount);

  // Generate requests: each request targets one identity in round-robin fashion
  const requests: OrchestratorRequest[] = [];
  for (let i = 0; i < requestsPerIdentity * identityCount; i++) {
    const identity = identities[i % identityCount];
    requests.push(buildRequest(identity.id));
  }

  return {
    name,
    identities,
    requests,
    concurrentCount,
    description: `${identityCount} identities, ${requests.length} requests, concurrency ${concurrentCount}`,
  };
}

/**
 * Single-request latency measurement scenario.
 */
export const DEFAULT_LATENCY_SCENARIO: PerformanceScenario =
  createPerformanceScenario("default-latency", {
    identityCount: 1,
    requestsPerIdentity: 1,
    concurrentCount: 1,
  });

/**
 * Concurrent load testing scenario.
 */
export const DEFAULT_CONCURRENCY_SCENARIO: PerformanceScenario =
  createPerformanceScenario("default-concurrency", {
    identityCount: 5,
    requestsPerIdentity: 2,
    concurrentCount: 5,
  });

/**
 * Stress testing scenario with higher load.
 */
export const DEFAULT_STRESS_SCENARIO: PerformanceScenario =
  createPerformanceScenario("default-stress", {
    identityCount: 10,
    requestsPerIdentity: 5,
    concurrentCount: 10,
  });
