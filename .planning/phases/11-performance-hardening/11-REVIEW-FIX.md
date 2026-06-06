---
phase: 11-performance-hardening
fixed_at: 2026-06-06T12:30:00Z
review_path: .planning/phases/11-performance-hardening/11-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 5
skipped: 1
status: partial
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-06-06T12:30:00Z
**Source review:** .planning/phases/11-performance-hardening/11-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (1 critical, 5 warnings)
- Fixed: 5 (1 critical, 4 warnings)
- Skipped: 1 (1 warning — already compatible)
- Info findings (IN-01 through IN-05): excluded by scope (critical_warning only)

## Fixed Issues

### CR-01: OpenAPI spec globally requires bearer authentication, contradicting documented no-auth v1 policy

**Files modified:** `api/openapi.yml`
**Commit:** `7e1191c`
**Applied fix:** Changed `security: - bearerAuth: []` to `security: []` at the global level. The `securitySchemes` definition for bearerAuth is preserved for future v2 auth support, but the global requirement no longer forces generated API clients to send `Authorization: Bearer` headers.

### WR-01: concurrency.test.ts does not call `anchorLoader.load()` while latency.test.ts does

**Files modified:** `api/src/tests/performance/concurrency.test.ts`
**Commit:** `c42ea1d`
**Applied fix:** Made `createOrchestrator` async and added `await anchorLoader.load()` after creating the `SymbolicAnchorLoader` instance, matching the pattern used in `latency.test.ts`. Updated all 4 call sites to `await createOrchestrator()`.

### WR-03: OpenAPI `IdentityVersion.state` description silently ignored

**Files modified:** `api/openapi.yml`
**Commit:** `40f79b1`
**Applied fix:** Wrapped the `$ref` in an `allOf` wrapper so the `description` sibling is preserved per OpenAPI 3.0 spec. Changed:
```yaml
state:
  $ref: '#/components/schemas/SigilIdentity'
  description: Full identity state at this version
```
to:
```yaml
state:
  description: Full identity state at this version
  allOf:
    - $ref: '#/components/schemas/SigilIdentity'
```

### WR-04: benchmark.ts `summary()` returns object with NaN values when no measurements exist

**Files modified:** `api/src/tests/helpers/benchmark.ts`
**Commit:** `7d01f98`
**Applied fix:** Added an explicit early return in `summary()` when `count === 0`, returning a fully NaN-filled object with `count: 0` instead of relying on each individual stats method to return NaN independently. This makes the empty state explicit and produces clearer diagnostic output.

### WR-05: latency.test.ts `beforeAll` registers mock provider that `beforeEach` immediately overwrites

**Files modified:** `api/src/tests/performance/latency.test.ts`
**Commit:** `871265d`
**Applied fix:** Removed the `MockProviderFactory` instantiation and `registry.register()` call from `beforeAll` (lines 49-53). The `beforeEach` already calls `registry.reset()` and re-registers the mock provider, so the `beforeAll` registration was dead code.

## Skipped Issues

### WR-02: ts-jest 29.x used with jest 30.x — potential compatibility issue

**File:** `api/package.json:26`, `web/package.json:26`
**Reason:** Already compatible — verified via `npm view ts-jest peerDependencies` that `ts-jest@29.4.11` declares `jest: '^29.0.0 || ^30.0.0'` as its peer dependency range. The installed version officially supports both jest 29 and jest 30. No changes needed.
**Original issue:** The review flagged that ts-jest 29.x was designed for jest 29.x and the major version mismatch could cause subtle test failures. However, the peer dependency declaration confirms jest 30 compatibility.

---

_Fixed: 2026-06-06T12:30:00Z_
_Fixer: OpenCode (gsd-code-fixer)_
_Iteration: 1_
