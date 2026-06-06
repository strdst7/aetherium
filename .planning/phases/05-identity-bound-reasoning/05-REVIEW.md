---
phase: 05-identity-bound-reasoning
reviewed: 2026-06-07T12:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - api/src/services/identity-binding.ts
  - api/src/services/identity-constraints.ts
  - api/src/services/memory-service.ts
  - api/src/services/orchestrator.ts
  - api/src/services/agent-builder.ts
  - api/src/services/multi-agent-orchestrator.ts
  - api/src/services/reflective-service.ts
  - api/src/controllers/multi-agent.ts
  - api/src/index.ts
findings:
  critical: 3
  warning: 6
  info: 3
  total: 12
status: issues_found
---

# Phase 05: Code Review Report — Identity-Bound Reasoning

**Reviewed:** 2026-06-07T12:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

This review covers the identity-binding layer (IdentityBindingService, IdentityConstraintEngine), identity-scoped memory retrieval, the Orchestrator identity injection pipeline, AgentBuilder identity passthrough, MultiAgentOrchestrator council alignment, ReflectiveService constraint evaluation, the multi-agent controller, and bootstrap wiring in index.ts.

**Key findings:** A critical cross-identity memory leak in the Archivist agent (the multi-agent council's memory retrieval is NOT identity-scoped). The constraint engine has a buggy rule parser that truncates values containing colons. The multi-agent validation "regeneration" is simulated by appending constraint text rather than actually calling the LLM. Several warnings around logging PII, mythification asymmetry in retry loops, and missing cache for not-found identities.

---

## Critical Issues

### CR-01: Cross-identity memory leak in Archivist agent

**File:** `api/src/agents/archivist.ts:15`
**Issue:** The Archivist agent calls `this.memoryService.vectorSearch(embedding, 0.8, 8)` without the 4th `identityAnchor` parameter. The `MemoryService.vectorSearch` method only applies identity-scoping (`filter.sigil = identityAnchor`) when the parameter is provided (line 84). Without it, ALL memory documents with embeddings are returned regardless of identity, leaking memories across identities.

The Orchestrator correctly passes `identity_anchor` at `orchestrator.ts:93` and `orchestrator.ts:196`, but the Archivist — the first agent in the multi-agent council pipeline — does not.

```typescript
// Archivist.ts:15 — BUG: identityAnchor not passed
const results = await this.memoryService.vectorSearch(embedding, 0.8, 8);

// Should be:
const results = await this.memoryService.vectorSearch(embedding, 0.8, 8, ctx.identityAnchor);
```

**Fix:**
```typescript
const results = await this.memoryService.vectorSearch(embedding, 0.8, 8, ctx.identityAnchor);
```

### CR-02: IdentityConstraintEngine rule parsing truncates multi-colon values

**File:** `api/src/services/identity-constraints.ts:44,59,74`
**Issue:** All three rule types (`"must contain:"`, `"must not contain:"`, `"tone:"`) extract the value using `rule.split(":")[1]?.trim()`. This only captures text after the first colon, dropping everything after a second colon.

For example, a rule `"must contain: format: JSON"` would extract `"format"` instead of `"format: JSON"`. This causes the constraint check to look for the wrong substring, producing false negatives or false positives.

This affects lines:
- Line 44: `required = rule.split(":")[1]?.trim()` for "must contain:"
- Line 59: `forbidden = rule.split(":")[1]?.trim()` for "must not contain:"
- Line 74: `tone = rule.split(":")[1]?.trim()` for "tone:"

**Fix:** Use `split(":").slice(1).join(":").trim()` instead of `split(":")[1]`:
```typescript
// Line 44 fix:
const required = rule.split(":").slice(1).join(":").trim() || "";

// Line 59 fix:
const forbidden = rule.split(":").slice(1).join(":").trim() || "";

// Line 74 fix:
const tone = rule.split(":").slice(1).join(":").trim() || "";
```

### CR-03: MultiAgentOrchestrator pseudo-regeneration does not actually regenerate output

**File:** `api/src/services/multi-agent-orchestrator.ts:98-109`
**Issue:** When an agent's output fails Sovereign Halo validation, the `validateAgentOutput` method "regenerates" by simply appending constraint violation text to the original output and re-validating:

```typescript
const tightenedOutput = `${output}\n\n[Constraints: ${violations.join("; ")}]`;
const newReport = await this.sovereignHalo.validate(tightenedOutput, identity);
```

This is not regeneration — it is text concatenation. The original violating content is still present in `tightenedOutput`, so re-validation will likely fail again. The returned `regeneratedOutput` (line 106) is the original output with annotations appended, not an LLM-generated alternative. This defeats the purpose of the validation-retry pipeline.

**Fix:** Instead of concatenating and re-validating, call the provider's `generate` method with the tightened constraints as part of the prompt, similar to how `orchestrator.ts:276-281` works, or remove the "regeneration" claim and return the validation failure directly.

---

## Warnings

### WR-01: PII leak — identity anchor logged to console

**File:** `api/src/services/identity-binding.ts:54`
**Issue:** The latency warning log includes the raw `identityAnchor` string:
```typescript
console.warn(`[IdentityBinding] Lookup latency ${latency}ms exceeded 200ms threshold for ${identityAnchor}`);
```
The identity anchor may contain PII (e.g., email, username, or internal ID). In production with centralized log aggregation, this leaks identity data into logs.

**Fix:** Redact or hash the anchor in log output, or log only the latency without the identifier:
```typescript
console.warn(`[IdentityBinding] Lookup latency ${latency}ms exceeded 200ms threshold`);
```

### WR-02: Mythification skipped for regenerated outputs in Sovereign Halo retry loop

**File:** `api/src/services/orchestrator.ts:439-457` (in `generateAndValidate`), `276-283` (in `processWithTools`)
**Issue:** The initial output is passed through `this.mythicModule.mythify()` (lines 415-424, 239-248). However, regenerated outputs in the Sovereign Halo retry loop bypass mythification entirely:
```typescript
// Line 449-455 in generateAndValidate — no mythify call
candidate = await provider.generate({ ... });
responseText = candidate.text || '';
attempts++;
```

This creates an asymmetry: the first attempt has mythic symbolic anchors and tone, but retry attempts do not. If mythification is required for identity compliance, retries are less likely to pass validation. If mythification introduced the violation, retries without it are more likely to pass but will lack identity fidelity.

**Fix:** Apply `this.mythicModule.mythify()` after each regeneration in the retry loop:
```typescript
candidate = await provider.generate({ ... });
responseText = candidate.text || '';
if (identity && this.mythicModule && responseText) {
  try {
    const mythifyResult = await this.mythicModule.mythify(identity, responseText);
    if (mythifyResult.applied) {
      responseText = mythifyResult.output;
    }
  } catch (error) {
    console.warn('[Orchestrator] Mythify failed:', error);
  }
}
```

### WR-03: AgentBuilder.executeTask hardcodes provider and confidence values

**File:** `api/src/services/agent-builder.ts:346,354`
**Issue:** In `executeTask`, the `reasoning.orchestrator.selectedProvider` is hardcoded to `"gemini"` (line 346), and `reasoning.reflective.confidenceScore` is always `1.0` (line 354) regardless of actual execution outcome:
```typescript
selectedProvider: "gemini",    // should be actual provider
confidenceScore: 1.0,          // misleading if steps failed
```
If some steps fail, `confidenceScore: 1.0` is semantically incorrect and could mislead downstream consumers.

**Fix:** Either collect the actual provider from the orchestrator result, or omit the field when unavailable. Compute confidenceScore based on completed/failed step ratio:
```typescript
selectedProvider: "unknown",   // or propagate from orchestrator
confidenceScore: plan.steps.length > 0 ? completedSteps / plan.steps.length : 0,
```

### WR-04: IdentityBindingService does not cache null/not-found results

**File:** `api/src/services/identity-binding.ts:43-50`
**Issue:** When `identityService.getIdentityById()` returns `null`, the result is NOT cached. A subsequent request with the same (invalid) identity anchor will hit MongoDB again, repeating the lookup. If a client repeatedly sends invalid anchors, this generates unnecessary database load:
```typescript
const identity = await this.identityService.getIdentityById(identityAnchor);

if (identity) {
  // Only caches found identities — missing identities always go to DB
  this.cache.set(identityAnchor, { identity, timestamp: Date.now() });
}
```

**Fix:** Cache null results with a sentinel value (shorter TTL recommended for nulls):
```typescript
this.cache.set(identityAnchor, {
  identity: null as unknown as SigilIdentity, // sentinel
  timestamp: Date.now(),
});
```
Then check for sentinel on retrieval:
```typescript
if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
  return cached.identity; // null sentinel propagates correctly
}
```

### WR-05: searchByMetadata and getAll lack identity scoping

**File:** `api/src/services/memory-service.ts:110-115,132-137`
**Issue:** `searchByMetadata` and `getAll` apply no identity-scoping filter. They return all documents matching the caller's arbitrary filter or all documents in the collection. While `vectorSearch` correctly scopes by `sigil` when `identityAnchor` is provided, these two methods can be called from any code path and may leak data across identities:
```typescript
async searchByMetadata(filter: Record<string, any>, limit: number = 10): Promise<MemoryDocument[]> {
  return this.collection.find(filter).limit(limit).toArray();  // no sigil filter
}

async getAll(): Promise<MemoryDocument[]> {
  return this.collection.find({}).toArray();  // all documents, all identities
}
```

**Fix:** Either make `identityAnchor` required for these methods, or add documentation/warnings that callers must include sigil in their filter. For `getAll()`, consider removing it or restricting to admin contexts only.

### WR-06: generatePlan does not inject identity context

**File:** `api/src/services/orchestrator.ts:308-391`
**Issue:** The `generatePlan` method creates a plan prompt without including any identity context (rules, name, mythic anchors). This means the generated plan is not identity-aware, potentially producing plans that violate identity constraints:
```typescript
async generatePlan(req: OrchestratorRequest, tools: ToolDefinition[]): Promise<TaskPlan> {
  const { identity_anchor, messages } = req;
  // identity_anchor is never used — no identity resolution or context injection
```

**Fix:** Resolve the identity (similar to lines 79-82 in `process`) and inject identity rules/mythic context into the planning prompt.

---

## Info

### IN-01: Double lowercasing in ReflectiveService → IdentityConstraintEngine pipeline

**File:** `api/src/services/reflective-service.ts:37`, `api/src/services/identity-constraints.ts:41`
**Issue:** `ReflectiveService.evaluate` lowercases its text input at line 37:
```typescript
const text = (candidate.text || candidate || "").toLowerCase();
```
Then passes the lowercased text to `IdentityConstraintEngine.evaluate`, which lowercases it again at line 41:
```typescript
const outputLower = output.toLowerCase();
```
This is redundant. While harmless (lowercasing already-lowercase text is a no-op), it adds unnecessary processing and indicates a lack of coordination between the two services.

**Fix:** Either document that `IdentityConstraintEngine` accepts pre-lowercased text, or have `ReflectiveService` pass the original case and let the engine handle case normalization.

### IN-02: Hardcoded model names throughout orchestrator

**File:** `api/src/services/orchestrator.ts:230,277,342,407,449`
**Issue:** The model name `'gemini-1.5-pro'` is hardcoded in at least 5 locations across `orchestrator.ts`. If the provider configuration changes or a different model is desired, all these locations must be updated. The model configuration should come from a constant, environment variable, or the provider's default.

Affected lines:
- Line 230: `model: 'gemini-1.5-pro'` in `processWithTools`
- Line 277: `model: 'gemini-1.5-pro'` in `processWithTools` retry
- Line 342: `model: 'gemini-1.5-pro'` in `generatePlan`
- Line 407: `model: 'gemini-1.5-pro'` in `generateAndValidate` initial
- Line 449: `model: 'gemini-1.5-pro'` in `generateAndValidate` retry

**Fix:** Define a constant `DEFAULT_MODEL = 'gemini-1.5-pro'` and reference it consistently, or use `provider.capabilities.defaultModel` if the provider exposes one.

### IN-03: Redundant constraint information in tightened prompt builder

**File:** `api/src/services/orchestrator.ts:479-485`
**Issue:** The `buildTightenedPrompt` method constructs both a `constraintBlock` (prepended with "- ") and a `doNotBlock` (prepended with "DO NOT:"), but both derive from the same `violations` array. Violations that contain "must not contain" or "forbidden" appear twice in the prompt:
```
Previous attempt failed these checks:
- must not contain: XYZ
- ...

Strictly avoid:
DO NOT: must not contain: XYZ
```

This is redundant and adds noise to the prompt, potentially confusing the LLM. Either deduplicate by having only one block, or use a single consolidated constraint section.

**Fix:** Remove the `doNotBlock` construction and include all constraint information in the main `constraintBlock` with clear wording.

---

_Reviewed: 2026-06-07T12:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: standard_
