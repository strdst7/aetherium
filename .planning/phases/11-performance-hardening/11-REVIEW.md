---
phase: 11-performance-hardening
reviewed: 2026-06-06T12:00:00Z
depth: deep
files_reviewed: 11
files_reviewed_list:
  - api/src/tests/helpers/benchmark.ts
  - api/src/tests/fixtures/performance-fixtures.ts
  - api/src/tests/performance/latency.test.ts
  - api/src/tests/performance/concurrency.test.ts
  - api/jest.config.js
  - api/openapi.yml
  - docs/API_INTEGRATION.md
  - docs/DEPLOYMENT.md
  - README.md
  - api/package.json
  - web/package.json
findings:
  critical: 1
  warning: 5
  info: 5
  total: 11
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-06-06T12:00:00Z
**Depth:** deep
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 11 (Performance Hardening) delivers benchmark utilities, performance test fixtures, latency and concurrency validation tests, enriched OpenAPI spec, API integration guide, deployment guide, and updated README. The implementation is solid overall — test infrastructure is well-designed, the OpenAPI spec is comprehensive, and documentation is thorough. One critical contract issue in the OpenAPI spec must be addressed before release, and several warnings should be fixed to prevent confusion for API integrators.

## Critical Issues

### CR-01: OpenAPI spec globally requires bearer authentication, contradicting documented no-auth v1 policy

**File:** `api/openapi.yml:1849-1856`
**Issue:** The OpenAPI spec defines a global `security` requirement for `bearerAuth`:
```yaml
securitySchemes:
  bearerAuth:
    type: http
    scheme: bearer
    description: Bearer token for authentication
security:
  - bearerAuth: []
```
This applies bearer authentication to every endpoint. However, `docs/API_INTEGRATION.md:32` explicitly states: "v1 of the Aetherium API does not require authentication. API key authentication is planned for v2." Any API client auto-generated from this spec will send `Authorization: Bearer <token>` headers, causing 401 errors against the actual unauthenticated server.

**Fix:**
```yaml
# Remove the global security requirement for v1.
# Keep the securitySchemes definition for when v2 auth is added,
# but remove the global 'security:' block or set it to empty.
security: []
```

## Warnings

### WR-01: concurrency.test.ts does not call `anchorLoader.load()` while latency.test.ts does

**File:** `api/src/tests/performance/concurrency.test.ts:62`
**Issue:** In the `createOrchestrator` helper (line 52-79), `SymbolicAnchorLoader` is instantiated but `load()` is never called. In contrast, `latency.test.ts:40` properly awaits `anchorLoader.load()`. The `SovereignHaloService` is created with `requireSymbolicAnchors: false`, which likely prevents a crash, but the inconsistency means the halo service operates without loaded anchors in concurrency tests. If the halo behavior changes to require anchors, these tests will silently produce incorrect results.

**Fix:**
```typescript
function createOrchestrator(options?: { ... }): Orchestrator {
  const mockProvider = new MockProviderFactory({...});
  registry.register(mockProvider, 0, ["local", "embeddings"]);

  const anchorLoader = new SymbolicAnchorLoader();
  anchorLoader.load(); // Add this — match latency.test.ts behavior
  const mythicModule = new MythicModule(anchorLoader);
  // ...
}
```

### WR-02: ts-jest 29.x used with jest 30.x — potential compatibility issue

**File:** `api/package.json:26`, `web/package.json:26`
**Issue:** Both `api/package.json` and `web/package.json` declare `ts-jest: ^29.4.11` alongside `jest: ^30.4.2`. ts-jest 29.x was designed for jest 29.x. The major version mismatch may cause subtle test failures, transform errors, or configuration incompatibilities. The `createDefaultPreset()` API in `jest.config.js:1` may work by luck but is not guaranteed stable across this version gap.

**Fix:** Upgrade ts-jest to a version compatible with jest 30, or downgrade jest to 29.x to match ts-jest. Check ts-jest release notes for jest 30 support before upgrading.

### WR-03: OpenAPI `IdentityVersion.state` description silently ignored

**File:** `api/openapi.yml:1511-1513`
**Issue:** The `state` property in `IdentityVersion` schema has both `$ref` and `description` as siblings:
```yaml
state:
  $ref: '#/components/schemas/SigilIdentity'
  description: Full identity state at this version
```
In OpenAPI 3.0, sibling keywords next to `$ref` are ignored by compliant parsers. The `description` is silently dropped. API documentation generators will not display this description.

**Fix:** Move the description to the property level using an overlay or wrapper:
```yaml
state:
  description: Full identity state at this version
  allOf:
    - $ref: '#/components/schemas/SigilIdentity'
```

### WR-04: benchmark.ts `summary()` returns object with NaN values when no measurements exist

**File:** `api/src/tests/helpers/benchmark.ts:102-124`
**Issue:** When `measurements` is empty, every stats method (`getMin`, `getMax`, `getMean`, `getP50`, `getP95`, `getP99`, `getStdDev`) returns `NaN`. The `summary()` method returns an object with 7 NaN fields. While this correctly causes test assertions to fail (since `NaN < 5000` is `false`), it produces confusing diagnostic output. A developer reading `console.log(benchmark.summary())` would see `{ min: NaN, mean: NaN, ... }` without understanding why.

**Fix:**
```typescript
summary(): { label: string; count: number; min: number; /* ... */ } {
  const count = this.measurements.length;
  if (count === 0) {
    return {
      label: this.label,
      count: 0,
      min: NaN,
      mean: NaN,
      p50: NaN,
      p95: NaN,
      p99: NaN,
      max: NaN,
      stdDev: NaN,
    };
  }
  // existing logic
}
```
This makes the empty-state explicit rather than relying on each method independently returning NaN.

### WR-05: latency.test.ts `beforeAll` registers mock provider that `beforeEach` immediately overwrites

**File:** `api/src/tests/performance/latency.test.ts:53,72-81`
**Issue:** The `beforeAll` block registers a mock provider at line 53:
```typescript
registry.register(mockProvider, 0, ["local", "embeddings"]);
```
But `beforeEach` (lines 72-81) calls `registry.reset()` then registers a new mock provider before every test. The `beforeAll` registration is dead code — it runs once but is immediately invalidated by the first `beforeEach`. While this doesn't cause incorrect behavior, it adds confusion for anyone maintaining the test.

**Fix:** Remove the `registry.register()` call from `beforeAll` (line 53), keeping only the service initialization and orchestrator creation. The `beforeEach` handles provider registration.

## Info

### IN-01: benchmark.ts creates redundant array copies in each stats method

**File:** `api/src/tests/helpers/benchmark.ts:46,67-83`
**Issue:** Each call to `getMin()`, `getMax()`, `getMean()`, `getStdDev()`, and `getPercentile()` independently creates a new array via `this.measurements.map((m) => m.durationMs)`. A single `summary()` call creates 8 separate array copies. For test utilities this is acceptable, but caching the durations array or computing stats in a single pass would be cleaner.

**Fix:** Consider a private `getDurations()` method or computing all stats in `summary()` in one pass.

### IN-02: Console.log statements in test files

**File:** `api/src/tests/performance/latency.test.ts:101,124,151`, `api/src/tests/performance/concurrency.test.ts:300`
**Issue:** Test files use `console.log` for diagnostic benchmark output. While acceptable in test code for CI visibility, these should ideally use a conditional logger or `jest.reporter` to avoid noise in non-diagnostic runs.

**Fix:** No action required — standard practice for performance test diagnostics.

### IN-03: README.md contains placeholder repository URL

**File:** `README.md:38`
**Issue:** The quickstart section uses `git clone <repository-url>` as a placeholder. Before public release, this should be replaced with the actual repository URL.

**Fix:** Replace `<repository-url>` with the actual Git URL.

### IN-04: DEPLOYMENT.md documents default MinIO credentials

**File:** `docs/DEPLOYMENT.md:222-223`
**Issue:** The environment configuration reference lists `MINIO_ROOT_PASSWORD` with default value `minio123`. While this is the standard MinIO default for local development and is documented as such, it's worth noting that production deployments MUST override this.

**Fix:** Add a note that these are development-only defaults and must be changed for any non-local deployment.

### IN-05: performance-fixtures.ts `createBatchIdentities` return type differs from plan

**File:** `api/src/tests/fixtures/performance-fixtures.ts:27`
**Issue:** The plan specified `createBatchIdentities(count: number): Promise<SigilIdentity[]>` using `IdentityService.createIdentity` (async). The implementation returns `SigilIdentity[]` (synchronous) using the offline `createIdentity` factory. This is the correct design choice — test fixtures should not depend on database connections — but it deviates from the plan.

**Fix:** No action required — implementation is correct. Plan inaccuracy noted for future reference.

---

_Reviewed: 2026-06-06T12:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: deep_
