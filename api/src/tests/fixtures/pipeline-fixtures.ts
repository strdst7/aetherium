import { SigilIdentity, ReasonRequest } from "../../types/api-contracts";
import { AuditRecord } from "../../types/audit";
import { createIdentity, DEFAULT_TEST_IDENTITY } from "./identity-factory";

/**
 * A full pipeline test scenario bundling an identity, a request,
 * and expectations for output and audit fields.
 */
export interface PipelineScenario {
  name: string;
  identity: SigilIdentity;
  request: ReasonRequest;
  expectedOutputContains?: string[];
  expectedTone?: string;
  expectedAuditFields?: (keyof AuditRecord)[];
}

/**
 * Create a pipeline scenario with sensible defaults.
 */
export function createPipelineScenario(
  name: string,
  overrides?: Partial<PipelineScenario>
): PipelineScenario {
  const base: PipelineScenario = {
    name,
    identity: DEFAULT_TEST_IDENTITY,
    request: {
      identity_anchor: DEFAULT_TEST_IDENTITY.id,
      messages: [{ role: "user", content: "Explain quantum computing" }],
    },
    expectedOutputContains: [],
    expectedTone: "neutral",
    expectedAuditFields: [
      "recordId",
      "identityId",
      "prompt",
      "output",
      "timestamp",
      "hash",
    ],
  };

  return {
    ...base,
    ...overrides,
    request: overrides?.request
      ? { ...base.request, ...overrides.request }
      : base.request,
  };
}

// ── Built-in scenarios ────────────────────────────────────────────────

/** Neutral identity with a simple factual prompt. */
export const NEUTRAL_IDENTITY_SCENARIO = createPipelineScenario("neutral_identity");

/** Mythic identity with formal voice and academic tone. */
const mythicIdentity = createIdentity({
  name: "Mythic Identity",
  config: {
    preferredProvider: "gemini",
    customRules: [
      "Use formal language",
      "tone: academic",
      "must contain: wisdom",
      "must contain: scholar"
    ],
  },
});

export const MYTHIC_IDENTITY_SCENARIO = createPipelineScenario("mythic_identity", {
  identity: mythicIdentity,
  request: {
    identity_anchor: mythicIdentity.id,
    messages: [{ role: "user", content: "Describe the nature of existence" }],
  },
  expectedTone: "academic",
  expectedOutputContains: ["formal", "academic"],
});

/** Constrained identity with forbidden behaviors. */
const constrainedIdentity = createIdentity({
  name: "Constrained Identity",
  config: {
    preferredProvider: "gemini",
    customRules: [
      "Be helpful",
      "must not contain: no jokes",
      "must not contain: no slang"
    ],
  },
});

export const CONSTRAINED_IDENTITY_SCENARIO = createPipelineScenario("constrained_identity", {
  identity: constrainedIdentity,
  request: {
    identity_anchor: constrainedIdentity.id,
    messages: [{ role: "user", content: "Tell me a joke" }],
  },
  expectedOutputContains: ["cannot", "forbidden"],
});
