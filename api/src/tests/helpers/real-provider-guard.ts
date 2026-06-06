import { checkRequiredEnvVars, RequiredEnvVar } from "./env-checker";

export interface RealProviderGuardResult {
  shouldRun: boolean;
  reason?: string;
}

/**
 * Determine whether real-provider E2E tests should execute.
 *
 * Checks for GEMINI_API_KEY (primary) or GOOGLE_API_KEY (legacy alias).
 * Returns `shouldRun: false` when credentials are missing so that CI
 * does not fail.
 */
export function guardRealProviderTests(): RealProviderGuardResult {
  const force = process.env.FORCE_REAL_PROVIDER_TESTS === "true";
  if (force) {
    return {
      shouldRun: true,
      reason: "Forced via FORCE_REAL_PROVIDER_TESTS=true",
    };
  }

  const vars: RequiredEnvVar[] = [
    {
      name: "GEMINI_API_KEY",
      description: "API key for Gemini provider (Google AI Studio)",
      validate: (v) => v.length >= 10,
    },
  ];

  const result = checkRequiredEnvVars(vars);

  // Also accept GOOGLE_API_KEY as a fallback alias
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const hasAlias =
    googleApiKey !== undefined &&
    googleApiKey.trim() !== "" &&
    googleApiKey.length >= 10;

  if (result.allPresent || hasAlias) {
    return { shouldRun: true };
  }

  return {
    shouldRun: false,
    reason: `Missing real provider credentials: ${result.missing.join(
      ", "
    )} (also checked GOOGLE_API_KEY alias)`,
  };
}

/**
 * Jest-compatible `describe` wrapper that only runs when real-provider
 * credentials are available.
 */
export function describeIfRealProvider(
  name: string,
  fn: () => void
): void {
  const guard = guardRealProviderTests();
  if (guard.shouldRun) {
    describe(name, fn);
  } else {
    describe.skip(name, () => {
      it("skipped — real provider credentials not available", () => {});
    });
  }
}

/**
 * Jest-compatible `it` wrapper that only runs when real-provider
 * credentials are available.
 */
export function itIfRealProvider(
  name: string,
  fn: () => Promise<void> | void,
  timeout?: number
): void {
  const guard = guardRealProviderTests();
  if (guard.shouldRun) {
    it(name, (done?: jest.DoneCallback) => {
      const result = fn();
      if (result && typeof (result as any).then === "function") {
        (result as Promise<void>).then(() => {
          if (done) done();
        }).catch((err: any) => {
          if (done) done(err);
          else throw err;
        });
      } else if (done) {
        done();
      }
    }, timeout);
  } else {
    it.skip(name, () => {});
  }
}
