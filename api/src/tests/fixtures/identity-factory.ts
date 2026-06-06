import { createHash } from "crypto";
import { SigilIdentity, IdentityConfig } from "../../types/identity";

/**
 * Create a single test identity with sensible defaults.
 * All fields match the SigilIdentity interface exactly.
 * The sigilHash is recalculated automatically if name or developerId changes.
 */
export function createIdentity(overrides?: Partial<SigilIdentity>): SigilIdentity {
  const now = new Date().toISOString();

  const name = overrides?.name ?? "Test Identity";
  const developerId = overrides?.developerId ?? "test@example.com";

  const baseConfig: IdentityConfig = {
    preferredProvider: "gemini",
    customRules: ["Be helpful"],
  };

  const identity: SigilIdentity = {
    id: overrides?.id ?? `test-id-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name,
    developerId,
    sigilHash: createHash("sha256")
      .update(`${name}|${developerId}`)
      .digest("hex")
      .slice(0, 16),
    version: overrides?.version ?? 1,
    config: overrides?.config ? { ...baseConfig, ...overrides.config } : baseConfig,
    versions: overrides?.versions ?? [],
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  };

  return identity;
}

/**
 * Create a batch of test identities.
 */
export function createIdentityBatch(count: number): SigilIdentity[] {
  return Array.from({ length: count }, (_, i) =>
    createIdentity({ name: `Test Identity ${i + 1}` })
  );
}

/**
 * Frozen default test identity for deterministic references.
 */
export const DEFAULT_TEST_IDENTITY: Readonly<SigilIdentity> = Object.freeze(
  createIdentity()
);
