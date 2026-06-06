---
phase: 10-end-to-end-integration
fixed_at: 2026-06-07T12:00:00Z
review_path: .planning/phases/10-end-to-end-integration/10-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 10: End-to-End Integration & Testing — Code Review Fix Report

**Fixed at:** 2026-06-07T12:00:00Z
**Source review:** .planning/phases/10-end-to-end-integration/10-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: Express 4.x async route handler has no error forwarding wrapper

**Files modified:** `api/src/routes/health.ts`
**Applied fix:** Wrapped the entire `/health` handler body in a top-level try/catch block. On any unhandled error, the catch block logs the error to console and returns a 503 JSON response with `{ status: "error", detail: "Health check failed" }`. This prevents unhandled promise rejections that would cause the request to hang indefinitely.

### WR-02: `any`-typed service dependencies in health route constructor

**Files modified:** `api/src/routes/health.ts`
**Applied fix:** 
- Added imports for `MemoryService` and `ProviderRegistry` concrete types
- Replaced `any` types in the `createHealthRouter` options parameter: `memoryService` is now `MemoryService`, `providerRegistry` is now `ProviderRegistry`, `mcpClient` is now `{ isHealthy(): boolean }`
- Fixed the LLM health check logic to use `providerRegistry.pick({})` instead of iterating `listProviders()` metadata objects (which lacked the `healthCheck` method). The new logic attempts to `pick` a healthy provider — if none are available, the catch block sets `checks.llm = "error"`.

### WR-03: Mock embed returns shared array reference for all inputs

**Files modified:** `api/src/tests/helpers/mock-provider-factory.ts`
**Applied fix:** Changed `() => this.options.embedResult` to `() => [...this.options.embedResult]` in the `embed()` method's map callback. Each input now receives a fresh defensive copy of the embed result array, preventing shared mutable reference corruption.

### WR-04: CI uses `--passWithNoTests` masking empty test suites

**Files modified:** `.github/workflows/ci.yml`
**Applied fix:** Removed the `--passWithNoTests` flag from both the API test command (line 34) and the web test command (line 62). The `--forceExit` flag is preserved as-is — removing it would require proper teardown in test suites which is out of scope for this fix.

### WR-05: CI does not run linting, type-checking, or build verification

**Files modified:** `.github/workflows/ci.yml`
**Applied fix:** 
- Added a `Run API type check` step (`cd api && npx tsc --noEmit`) after dependency installation in the api-tests job
- Added a `Verify web build` step (`cd web && npm run build`) after dependency installation in the web-tests job
- API lint step was not added because the API package.json does not have a `lint` script; this can be added in a future iteration if desired

---

_Fixed: 2026-06-07T12:00:00Z_
_Fixer: OpenCode (gsd-code-fixer)_
_Iteration: 1_
