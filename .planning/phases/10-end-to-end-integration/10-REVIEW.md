---
phase: 10-end-to-end-integration
reviewed: 2026-06-07T12:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - api/src/tests/fixtures/identity-factory.ts
  - api/src/tests/fixtures/pipeline-fixtures.ts
  - api/src/tests/helpers/test-database.ts
  - api/src/tests/helpers/mock-provider-factory.ts
  - api/src/tests/helpers/env-checker.ts
  - api/src/tests/helpers/real-provider-guard.ts
  - api/src/routes/health.ts
  - .github/workflows/ci.yml
findings:
  critical: 0
  warning: 5
  info: 6
  total: 11
status: issues_found
---

# Phase 10: End-to-End Integration & Testing — Code Review Report

**Reviewed:** 2026-06-07T12:00:00Z
**Depth:** standard
**Files Reviewed:** 8 non-test files
**Status:** issues_found

## Summary

Reviewed test fixtures, test helpers, the health route, and the CI pipeline. The test infrastructure is generally well-structured with appropriate safety guards (database URI validation, real-provider gating). However, there are several quality concerns: Express 4.x async handlers without error forwarding, shared mutable references in mock provider output, CI flags that mask failures, and type contract mismatches between the web client types and API contracts. No security vulnerabilities were found, but the CI configuration and health route patterns present reliability risks.

---

## Warnings

### WR-01: Express 4.x async route handler has no error forwarding wrapper

**File:** `api/src/routes/health.ts:19`
**Issue:** The `/health` route handler is declared as `async (req, res) => { ... }` without wrapping in an error-forwarding middleware. Express 4.x does not catch promise rejections from async route handlers. If any code path outside the existing try/catch blocks throws (or a future modification adds code outside them), the request will hang indefinitely without sending a response, and an unhandled promise rejection will occur.

The current implementation has individual try/catch around risky operations (lines 28-67), so there is no active crash today. However, every other async route in the codebase creates a risk surface — and this pattern is commonly exploited during maintenance when developers add new checks outside existing try/catch blocks.

**Fix:**
```typescript
import { wrapAsync } from "../middleware/async-wrap";

// Either wrap the handler:
router.get("/health", wrapAsync(async (req, res) => {
  // ... existing body
}));

// Or add a top-level try/catch:
router.get("/health", async (req, res) => {
  try {
    // ... existing body
  } catch (err) {
    console.error("[Health] Unexpected error:", err);
    res.status(503).json({ status: "error", detail: "Health check failed" });
  }
});
```

### WR-02: `any`-typed service dependencies in health route constructor

**File:** `api/src/routes/health.ts:10-12`
**Issue:** The `createHealthRouter` constructor accepts `memoryService`, `providerRegistry`, and `mcpClient` all typed as `any`. This defeats TypeScript's ability to catch breaking changes when the interfaces of these services evolve. If `MemoryService.vectorSearch` is renamed, removed, or has its signature changed, the health route will not produce a compile-time error — it will only fail at runtime.

**Fix:**
```typescript
import { MemoryService } from "../services/memory-service";
import { ProviderRegistry } from "../services/provider-registry";
// Define proper interface or import concrete types

export function createHealthRouter(options?: {
  memoryService?: MemoryService;
  providerRegistry?: ProviderRegistry;
  mcpClient?: { isHealthy(): boolean };
}): Router {
```

### WR-03: Mock embed returns shared array reference for all inputs

**File:** `api/src/tests/helpers/mock-provider-factory.ts:66`
**Issue:** The `embed()` method maps each input to the same `this.options.embedResult` array reference. All entries in the returned embeddings array point to the exact same `number[]` object. If any consumer mutates an embedding (e.g., `embeddings[0][42] = 0.99`), it corrupts the shared reference and affects all future callers.

```typescript
const embeddings = inputs.map(
  () => this.options.embedResult  // ← same reference for every input
);
```

While the arrays contain primitive values and are unlikely to be mutated in practice, this is a latent bug that violates the principle of least surprise. A test that naively normalizes or adjusts embeddings would corrupt the mock's internal state.

**Fix:**
```typescript
const embeddings = inputs.map(
  () => [...this.options.embedResult]  // defensive copy per input
);
```

### WR-04: CI uses `--passWithNoTests` masking empty test suites

**File:** `.github/workflows/ci.yml:34`
**Issue:** Both `api` and `web` test jobs run Jest with `--passWithNoTests`. If test files are accidentally deleted, excluded by a glob change, or the test runner configuration becomes misaligned, CI will pass without executing any tests. This creates a silent failure mode where a broken test configuration goes undetected until code is deployed.

Additionally, `--forceExit` is used, which forces Jest to exit without waiting for cleanup. This suggests there are likely resources (DB connections, timers, etc.) not being properly cleaned up in tests — and the problem is being masked rather than fixed.

**Fix:**
```yaml
# Remove --passWithNoTests. If a specific directory needs to be excluded,
# add explicit test match patterns instead.
run: cd api && npm test -- --coverage --detectOpenHandles --forceExit

# Investigate and remove --forceExit after proper teardown:
# run: cd api && npm test -- --coverage --detectOpenHandles
```

### WR-05: CI does not run linting, type-checking, or build verification

**File:** `.github/workflows/ci.yml:9-68`
**Issue:** The CI pipeline only runs unit/integration tests. There are no steps for:
- TypeScript type checking (`tsc --noEmit`)
- ESLint or Prettier checks
- Build verification (`npm run build`)
- Web E2E tests against a built app

Without type checking in CI, type-level regressions (e.g., adding a required field to an interface without updating all callers) will only be caught at runtime or during local development. This is a significant quality gap for a TypeScript project.

**Fix:**
```yaml
- name: Run API type check
  run: cd api && npx tsc --noEmit

- name: Run API lint
  run: cd api && npm run lint

- name: Verify web build
  run: cd web && npm run build
```

---

## Info

### IN-01: Audit integration test file path mismatch in review scope

**File:** `api/src/tests/audit-integration.test.ts` (listed path does not exist)
**Issue:** The file `api/src/tests/audit-integration.test.ts` was listed in the review scope but does not exist at that path. The actual file is at `api/src/tests/services/audit-integration.test.ts`. This should be corrected in future review scopes. The file itself is present and well-written.

### IN-02: Unique index on `developerId` constrains test scenarios

**File:** `api/src/tests/helpers/test-database.ts:77`
**Issue:** The test database setup creates a unique index on `developerId`. The identity factory's `createIdentityBatch()` function creates multiple identities with the same default `developerId` (`"test@example.com"`). While no current test uses `createIdentityBatch` with DB insertion, a future test that does so would fail with a duplicate key error rather than providing a clear diagnostic. Consider using a non-unique index or documenting this constraint.

### IN-03: Pipeline fixture scenario `CONSTRAINED_IDENTITY_SCENARIO` expects mock output it cannot match

**File:** `api/src/tests/fixtures/pipeline-fixtures.ts:90-96`
**Issue:** The scenario sets `expectedOutputContains: ["cannot", "forbidden"]`, but the mock provider defaults to `"Mock generated response"` which does not contain either word. The scenario is never consumed by any test in the reviewed scope, making it dead code. If activated, its expectations would fail against the unconfigured mock. Either document that a custom `responseText` is required, or remove the unused scenario.

### IN-04: Web type `ReasoningResponse.reflective.violations[].type` mismatches API contract

**File:** `web/src/types/api.ts:95` (cross-reference with `api/src/types/api-contracts.ts:55`)
**Issue:** The web client type defines violations as `{ type: string; severity: string; message: string }` but the API contract (`Violation`) defines the field as `rule: string`. The web client sends requests with `type` in its understanding of the type, but the API responds with `rule`. Accessing `violation.type` on a server response returns `undefined`.

### IN-05: Web type `suggestedConstraints` shape mismatches API contract

**File:** `web/src/types/api.ts:96` (cross-reference with `api/src/types/api-contracts.ts:63`)
**Issue:** The web client types `suggestedConstraints` as `Array<{ constraint: string; rationale: string }>` but the API contract defines it as `string[]`. The web client would attempt to access `.constraint` on a string value, resulting in `undefined` at runtime.

### IN-06: Web `IdentityVersion` type missing fields compared to API

**File:** `web/src/types/api.ts:20-27` (cross-reference with `api/src/types/identity.ts:12-19`)
**Issue:** The web type defines `IdentityVersion` with `version`, `sigilHash`, `config?`, and `createdAt`. The API contract defines it with `version`, `timestamp` (ISO 8601), and `state: SigilIdentity` (full identity snapshot). The web type omits `state` and `timestamp`, replacing them with `sigilHash` and `createdAt` — different fields with different semantics. This disconnect means the web client cannot properly render version history from the API.

---

_Reviewed: 2026-06-07T12:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: standard_
