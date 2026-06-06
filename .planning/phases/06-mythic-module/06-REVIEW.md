---
phase: 06-mythic-module
reviewed: 2026-06-07T10:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - api/src/services/mythic-module.ts
  - api/src/services/symbolic-anchor-loader.ts
  - api/src/types/mythic.ts
  - api/src/services/orchestrator.ts
  - design/sigil/v1.json
findings:
  critical: 0
  warning: 6
  info: 4
  total: 10
status: issues_found
---

# Phase 06: Code Review Report — Mythic Module

**Reviewed:** 2026-06-07T10:00:00Z  
**Depth:** standard  
**Files Reviewed:** 5  
**Status:** issues_found

## Summary

The Mythic Module introduces identity-bound tone, voice, and symbolic anchor transformations. The architecture is well-structured with clear separation of concerns (types, loader, module, orchestrator integration). However, several issues were found:

1. **ConstrainedPrompt drops mythic context** in the `process()` refinement path — regenerated text loses identity tone/voice/symbolic context.
2. **Regeneration skips mythification** in both `process()` and `processWithTools()` — retry attempts within Sovereign Halo produce output that bypasses identity transformations.
3. **Constraint checking is incomplete** — `tone_match` and `structure` constraint types are never verified, leading to incorrect confidence scores.
4. **Anchor loading is silently lossy** — JSON parse failures are swallowed and replaced with defaults, masking real problems.
5. **Default schema can return empty anchors** — `getDefaultSchema()` accesses anchors before the loader initializes.
6. **Plan generation ignores identity** — `generatePlan()` produces context-free task plans without mythic or identity context.

No security vulnerabilities (hardcoded secrets, injection, eval) were found. All issues are correctness/quality related.

---

## Warnings

### WR-01: Mythic context dropped in process() constrainedPrompt refinement

**File:** `api/src/services/orchestrator.ts:143-150`  
**Issue:** When the ReflectiveService returns `status: "refine"`, the method builds a `constrainedPrompt` that starts with a fresh system prompt (`"System: You are Aetherium. Preserve identity fidelity."`) instead of reusing the enriched `systemPrompt` from lines 96-109. The enriched prompt contains identity name, rules, and mythic context (tone, voice, symbolic anchors, constraints) — all of which are lost during refinement.

**Fix:** Reuse `systemPrompt` (which already includes identity and mythic context) instead of constructing a new base prompt:

```typescript
// Replace lines 143-150 with:
const constrainedPrompt = `${systemPrompt}

Constraints:
${constraints}

[Refinement attempt — address the above constraints]

Memories: ${JSON.stringify(memories)}
User: ${queryText}
`;
```

---

### WR-02: Regenerated outputs in Sovereign Halo retry loop skip mythification

**File:** `api/src/services/orchestrator.ts:276-282` (processWithTools) and `api/src/services/orchestrator.ts:449-455` (generateAndValidate)  
**Issue:** Mythification is applied once before entering the Sovereign Halo validation loop. When validation fails and the output is regenerated (via tightened prompt), the fresh LLM output is **not re-mythified** before the next validation pass. This means:

- On retry attempt ≥ 2, the output submitted to `sovereignHalo.validate()` is raw, non-mythified text.
- The identity's tone/voice/symbolic transformations are absent on retries.
- The tone deviation check in Sovereign Halo compares raw text against the expected tone, creating a self-defeating retry cycle — the validator looks for formal language but the regenerated text hasn't been formalized.

This affects both `processWithTools` (lines 276-282) and the `generateAndValidate` helper (lines 449-455).

**Fix:** Apply mythification to the regenerated text before the next validation pass. In `processWithTools`:

```typescript
// After line 282 (responseText = refined.text || ''), add:
if (identity && this.mythicModule && responseText) {
  try {
    const mythifyResult = await this.mythicModule.mythify(identity, responseText);
    if (mythifyResult.applied) {
      responseText = mythifyResult.output;
    }
  } catch (error) {
    console.warn('[Orchestrator] Mythify failed during retry:', error);
  }
}
```

Apply the same fix in `generateAndValidate` after line 455.

---

### WR-03: checkConstraints ignores tone_match and structure constraint types

**File:** `api/src/services/mythic-module.ts:340-358`  
**Issue:** The `checkConstraints` method only handles `must_include` and `must_avoid` constraint types. The `tone_match` and `structure` types are defined in both the `NarrativeConstraint` interface (`api/src/types/mythic.ts:41`) and emitted by `extractConstraints` (lines 256-268), but they are silently skipped during verification. This means:

- `tone_match` and `structure` violations are never detected.
- `mythify()` returns `confidence: 0.95` (passed) even when tone or structure constraints are violated.
- The constraint types exist in the type system but only 50% are enforced, creating false confidence in downstream consumers.

**Fix:** Add validation for `tone_match` and `structure` types:

```typescript
private checkConstraints(output: string, constraints: NarrativeConstraint[]): boolean {
  const outputLower = output.toLowerCase();

  for (const constraint of constraints) {
    if (constraint.type === "must_include") {
      const required = constraint.description.split(":")[1]?.trim() || "";
      if (required && !outputLower.includes(required.toLowerCase())) {
        return false;
      }
    } else if (constraint.type === "must_avoid") {
      const forbidden = constraint.description.split(":")[1]?.trim() || "";
      if (forbidden && outputLower.includes(forbidden.toLowerCase())) {
        return false;
      }
    } else if (constraint.type === "tone_match") {
      const targetTone = constraint.description.split(":")[1]?.trim().toLowerCase() || "";
      if (targetTone) {
        // Basic tone check — look for register keywords in output
        const toneKeywords: Record<string, string[]> = {
          formal: ["shall", "hereby", "furthermore", "pursuant"],
          playful: ["awesome", "fantastic", "super", "dandy", "fun"],
          somber: ["regrettable", "notable", "unfortunately", "solemn"],
        };
        const keywords = toneKeywords[targetTone];
        if (keywords && keywords.some(k => outputLower.includes(k))) {
          // Tone keyword found — this is a basic check
        }
      }
    } else if (constraint.type === "structure") {
      // Structure constraint — e.g., minimum length, paragraph structure
      const structDesc = constraint.description.toLowerCase();
      if (structDesc.includes("paragraph") && !outputLower.includes("\n\n")) {
        return false;
      }
      if (structDesc.includes("bullet") && !outputLower.includes("- ") && !outputLower.includes("* ")) {
        return false;
      }
    }
  }

  return true;
}
```

---

### WR-04: SymbolicAnchorLoader silently swallows JSON parse errors

**File:** `api/src/services/symbolic-anchor-loader.ts:48-53`  
**Issue:** The catch block in `load()` catches all errors — including `JSON.parse` syntax errors — and silently replaces the result with default anchors. The `loaded` flag is set to `true`, so all callers believe the design system was loaded successfully. If `v1.json` is malformed, the application will continue with silent degradation instead of failing visibly or logging an actionable error.

**Fix:** Differentiate between file-not-found (which merits graceful fallback) and parse errors (which indicate developer error):

```typescript
try {
  // ... load and parse ...
} catch (error) {
  if (error instanceof SyntaxError) {
    console.error(`[SymbolicAnchorLoader] Design system file at ${loadedPath || filePath} is malformed JSON:`, error);
    // Re-throw or crash — this is a developer error, not a runtime condition
    throw new Error(`Malformed design system JSON: ${error.message}`);
  }
  console.warn(`[SymbolicAnchorLoader] Failed to load design system from ${filePath}:`, error);
  this.anchors = this.getDefaultAnchors();
  this.loaded = true;
}
```

---

### WR-05: getDefaultSchema() may return empty symbolic anchors

**File:** `api/src/services/mythic-module.ts:175`  
**Issue:** `getDefaultSchema()` calls `this.anchorLoader.getAnchors().slice(0, 3)` without first ensuring the loader has been initialized. The constructor does **not** call `load()` — it's lazily invoked only when `generateSchema()` is called. If `getDefaultSchema()` is called before any `generateSchema()` call (e.g., for a neutral identity that never triggers `generateSchema()`), `getAnchors()` returns an empty array `[]`, and the default schema's `symbolicAnchors` will be empty.

**Fix:** Ensure anchors are loaded before accessing them:

```typescript
getDefaultSchema(): MythicIdentitySchema {
  // Ensure anchors are loaded
  if (!this.anchorLoader.isLoaded()) {
    this.anchorLoader.load().catch(err => {
      console.warn('[MythicModule] Failed to load anchors for default schema:', err);
    });
  }
  
  return {
    // ... existing fields ...
    symbolicAnchors: this.anchorLoader.getAnchors().slice(0, 3),
    // ...
  };
}
```

Alternatively, pre-load anchors in the constructor.

---

### WR-06: generatePlan() ignores identity and mythic context

**File:** `api/src/services/orchestrator.ts:308-391`  
**Issue:** The `generatePlan()` method does not resolve the identity, inject mythic context, or include identity rules in the prompt sent to the LLM. This means:
- Plans generated for an identity-bearer will not reflect the identity's tone, vocabulary, or constraints.
- A "formal" identity might receive a plan written in casual language.
- Identity constraints (e.g., "must contain: citation") are not included.

**Fix:** Resolve identity and inject context into the planning prompt:

```typescript
async generatePlan(req: OrchestratorRequest, tools: ToolDefinition[]): Promise<TaskPlan> {
  const { identity_anchor, messages } = req;
  const queryText = messages.map((m: any) => m.content).join(' ');

  // Resolve identity
  let identity: SigilIdentity | null = null;
  if (this.identityBinding) {
    identity = await this.identityBinding.resolve(identity_anchor);
  }

  const provider = await this.providerRegistry.pick({ requireToolUse: true });
  if (!provider.generateWithTools) {
    throw new Error('Provider does not support tool use');
  }

  // Build identity-aware planning prompt
  let identityContext = '';
  if (identity) {
    identityContext = `\nIdentity: ${identity.name}\nIdentity Rules: ${identity.config?.customRules?.join(', ') || 'none'}`;
    if (this.mythicModule) {
      try {
        const mythicContext = await this.mythicModule.generatePromptContext(identity);
        identityContext += `\n${mythicContext.fullContext}`;
      } catch (error) {
        console.warn('[Orchestrator] Failed to generate mythic context for plan:', error);
      }
    }
  }

  const planPrompt = `You are a task planner.${identityContext}

Given a user request and available tools, create a step-by-step plan...

// ... rest of existing prompt ...
`;
  // ...
}
```

---

## Info

### IN-01: Duplicate constraint types for tone rules (potential double-counting)

**File:** `api/src/services/mythic-module.ts:256-261`  
**Issue:** `extractConstraints` treats rules starting with `"tone:"` as both tone constraints (added to `NarrativeConstraint[]` with type `tone_match`) AND the same rules are used by `extractToneModel` to set the tone register. This means tone rules appear in both the tone model and the constraint list, potentially causing double-processing downstream. Consider whether tone rules need to be both a ToneModel.register and a NarrativeConstraint.

---

### IN-02: injectSymbolicReferences appends metadata comment to output

**File:** `api/src/services/mythic-module.ts:334-335`  
**Issue:** The method always appends `[Aligned with {concept}: {value}]` to the end of text. This is a meta-comment that may confuse end users if included in final responses. The method is named "inject" but only appends — it does not weave references into the body. Consider making this configurable or using a less obtrusive format.

**Suggestion:** Either remove the metadata comment for user-facing output, or gate it behind a flag (e.g., `debugSymbolic: true`).

---

### IN-03: Confidence scores in mythify are hardcoded constants

**File:** `api/src/services/mythic-module.ts:152-153`  
**Issue:** The confidence score is hardcoded to `0.95` (constraints pass) or `0.7` (constraints fail). These values are arbitrary and do not reflect any actual measurement of confidence. Downstream consumers may misinterpret these as statistically meaningful.

**Suggestion:** Either:
- Compute confidence based on actual transformations applied (e.g., ratio of text changed), or
- Document clearly that these are fixed heuristics, or
- Remove the confidence field if it's not used downstream.

---

### IN-04: makePoetic splits on bare period without sentence-boundary awareness

**File:** `api/src/services/mythic-module.ts:312-318`  
**Issue:** `text.split(".")` splits on every period, including those in abbreviations ("Dr.", "e.g.", "vs."), decimal numbers ("3.14"), and file extensions (".ts"). This can produce incorrect sentence fragments and add poetic flourishes in the wrong places.

**Suggestion:** For production use, either:
- Use a sentence-boundary detection library (e.g., `Intl.Segmenter`), or
- Use a regex that handles common abbreviations, or
- Document that this is a demonstration placeholder and will be replaced with LLM-based rewriting.

---

_Reviewed: 2026-06-07T10:00:00Z_  
_Reviewer: OpenCode (gsd-code-reviewer)_  
_Depth: standard_
