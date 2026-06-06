---
phase: 08-audit-immutability
fixed_at: '2026-06-07T12:30:00.000Z'
review_path: .planning/phases/08-audit-immutability/08-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 08: Code Review Fix Report — Audit & Immutability

**Fixed at:** 2026-06-07T12:30:00.000Z
**Source review:** .planning/phases/08-audit-immutability/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: `modelVersion` always resolves to `'unknown'`

**Files modified:** `api/src/services/orchestrator.ts`
**Applied fix:** Added a `modelName` parameter to `saveAuditRecord()` and replaced all hardcoded `'gemini-1.5-pro'` strings with a `DEFAULT_MODEL` constant. The `saveAuditRecord()` method now receives the model name explicitly from callers (`process()`, `processWithTools()`) instead of reading `provider.model` (which doesn't exist on `AIProvider`).

### WR-01: `originalOutput` stores the final processed output, not the raw LLM output

**Files modified:** `api/src/services/orchestrator.ts`
**Applied fix:** Modified `generateAndValidate()` to capture the raw LLM output before mythification as `originalOutput` and return it alongside `responseText`. Updated `processWithTools()` to capture `candidate.text` before mythification as `originalOutput`. Both methods now pass `originalOutput` to `saveAuditRecord()`, which uses it for `provenance.originalOutput` instead of `response.text` (the final post-processed output).

### WR-02: `Math.random()` used for UUID generation

**Files modified:** `api/src/services/audit-service.ts`
**Applied fix:** Replaced the custom `Math.random()`-based UUID generation with Node.js 20's built-in `crypto.randomUUID()`. Added `randomUUID` to the existing `crypto` import.

### WR-03: `generateHash` does not cover `originalOutput`

**Files modified:** `api/src/services/audit-service.ts`
**Applied fix:** Updated `generateHash()` to include all provenance fields (`originalOutput`, `modelVersion`, `regenerationAttempts`, `mythifyTransformations`) in the hash payload. Also switched from pipe-delimited string concatenation to `JSON.stringify` for the canonical form — this avoids delimiter-injection ambiguity if a field value contained `|`.

### WR-04: `isValidISODate` rejects valid ISO 8601 timestamps without `.000` milliseconds

**Files modified:** `api/src/controllers/audit.ts`
**Applied fix:** Relaxed the validation from requiring `date.toISOString() === dateString` (which only accepts millisecond-precision UTC format) to accepting any valid ISO 8601 string that includes a `T` separator. The new validator uses `Date.parse()` via `new Date(dateString)` and checks `dateString.includes("T")` to ensure a date-time (not just a date) was provided.

### WR-05: No verification endpoint for hash-based tamper detection

**Files modified:** `api/src/controllers/audit.ts`
**Applied fix:** Added a `TODO(v2)` comment at the route definition site describing the required verification endpoint. Per review guidance, the endpoint itself was NOT created — it is deferred to v2 as it requires a `getById()` method on `AuditService` and formal API contract definition.

---

_Fixed: 2026-06-07T12:30:00.000Z_
_Fixer: OpenCode (gsd-code-fixer)_
_Iteration: 1_
