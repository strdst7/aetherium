---
phase: 07-sovereign-halo
fixed_at: 2026-06-07T17:30:00Z
review_path: .planning/phases/07-sovereign-halo/07-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 7
skipped: 1
status: partial
---

# Phase 07: Sovereign Halo — Code Review Fix Report

**Fixed at:** 2026-06-07T17:30:00Z
**Source review:** `.planning/phases/07-sovereign-halo/07-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (2 critical, 6 warnings)
- Fixed: 7
- Skipped: 1

## Fixed Issues

### CR-02: Empty symbolic anchor value causes false positive detection via `String.includes("")`

**File:** `api/src/services/sovereign-halo.ts`
**Commit:** (not committed — applied directly)
**Applied fix:** Changed the anchor value detection logic to guard against empty anchor values. Instead of `String.includes("")` which always returns `true`, the fix first checks if `anchorValue` is truthy and has length > 0 before calling `includes`. The anchor is now only detected via value if there is a non-empty value to match against. Also extracted `anchorObj` to avoid redundant `find()` call.

### WR-01: Falsy `0` in `getMaxAttempts()` silently overrides explicit zero

**File:** `api/src/services/sovereign-halo.ts`
**Commit:** (not committed — applied directly)
**Applied fix:** Changed `||` (logical OR) to `??` (nullish coalescing) operator. This ensures that only `undefined`/`null` falls back to `MAX_HALO_ATTEMPTS` — an explicit `maxAttempts: 0` now correctly stays 0 instead of silently becoming 3.

### WR-02: Safe fallback message can be empty string when fallback rule has no value

**File:** `api/src/services/sovereign-halo.ts`
**Commit:** (not committed — applied directly)
**Applied fix:** Extracted `DEFAULT_FALLBACK` constant and used it as the fallback when the parsed fallback rule value is empty/whitespace-only. Previously, `"" || ""` produced an empty message; now empty values fall through to the default message.

### WR-03: Tone deviation check is a no-op for non-standard tone registers

**File:** `api/src/services/sovereign-halo.ts`
**Commit:** (not committed — applied directly)
**Applied fix:** Added an explicit `else` clause to the tone detection `if/else if` block. For unknown tone registers (e.g., `somber`, `poetic`, `urgent`), `detectedTone` is now set to `"unrecognized"`, which causes the deviation score to be `1.0` (strict failure) instead of silently passing with `0.3`.

### WR-04: Inconsistent `maxTokens` fallback between initial and retry generation

**Files:** `api/src/services/orchestrator.ts`
**Commit:** (not committed — applied directly)
**Applied fix:** Changed the initial generation calls in both `processWithTools` (line 234) and `generateAndValidate` (line 434) to use `req.maxTokens || 200`, matching the retry code paths. Previously, initial calls passed `req.maxTokens` directly (could be `undefined`), while retry calls used `req.maxTokens || 200`. Now all four call sites use the same fallback pattern.

### WR-05: No type validation for `identity_anchor` in multi-agent controller

**File:** `api/src/controllers/multi-agent.ts`
**Commit:** (not committed — applied directly)
**Applied fix:** Added explicit type validation for `identity_anchor` (must be non-empty string) and `prompt` (must be string), with distinct error messages for each. This prevents non-string values (numbers, arrays, objects) from propagating downstream to `IdentityBindingService.resolve()`.

### WR-06: No error logging in multi-agent catch block

**File:** `api/src/controllers/multi-agent.ts`
**Commit:** (not committed — applied directly)
**Applied fix:** Added `console.error("[MultiAgent] Error:", error)` before the existing 500 response handler. This ensures errors are logged for debugging production issues rather than being silently swallowed.

## Skipped Issues

### CR-01: Council agent "regeneration" appends text instead of regenerating — retry mechanism is a placebo

**File:** `api/src/services/multi-agent-orchestrator.ts:99-103`
**Reason:** Code context differs from review — the file has already been updated with a proper regeneration implementation. The current code imports `ProviderRegistryInstance`, builds a regeneration prompt with constraint violations, calls `provider.generate()` to produce new output, then validates the regenerated output through Sovereign Halo. The fix described in REVIEW.md has been addressed by a prior change to the file.

**Original issue:** The `validateAgentOutput` method's retry mechanism appended constraint text to the original output instead of actually regenerating it via an LLM provider, making profanity, forbidden content, and tone fixes ineffective.

---

_Fixed: 2026-06-07T17:30:00Z_
_Fixer: OpenCode (gsd-code-fixer)_
_Iteration: 1_
