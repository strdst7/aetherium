---
status: issues_found
files_reviewed: 18
depth: standard
findings:
  critical: 1
  warning: 7
  info: 6
  total: 14
files_reviewed_list:
  - api/src/adapters/ai-adapter.ts
  - api/src/adapters/gemini-provider.test.ts
  - api/src/adapters/gemini-provider.ts
  - api/src/adapters/mock-provider.ts
  - api/src/adapters/ollama-provider.ts
  - api/src/bootstrap/providers.test.ts
  - api/src/bootstrap/providers.ts
  - api/src/controllers/reason.ts
  - api/src/index.ts
  - api/src/services/agent-builder.test.ts
  - api/src/services/agent-builder.ts
  - api/src/services/mcp-client.test.ts
  - api/src/services/mcp-client.ts
  - api/src/services/mock-agent-builder.ts
  - api/src/services/mock-mcp-server.ts
  - api/src/services/orchestrator.ts
  - api/src/services/provider-registry.test.ts
  - api/src/services/provider-registry.ts
---

# Phase 01: Code Review Report — Agent Core Foundation

**Reviewed:** 2026-06-06T00:00:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

The Agent Core Foundation implementation introduces core abstractions for AI providers (Gemini, Ollama, Mock), a provider registry with health-check-based selection, an orchestrator with identity/memory/safety chains, an MCP client for tool execution, an AgentBuilder for tool and task modes, and a ReasonController that ties everything together into a single `/v1/reason` endpoint.

Overall the architecture is sound, but the codebase has **one critical runtime crash** (TDZ use-before-declaration of `auditService` in `index.ts` — the app will crash on startup), multiple validation bypasses caused by falsy-value short-circuit logic, several encoding-sensitive security exposures (API keys in URLs), and widespread quality issues including broken indentation that obscures control flow and duplicated logic across methods.

---

## Critical Issues

### CR-01: `auditService` used before `const` declaration — ReferenceError on startup

**File:** `api/src/index.ts:103`
**Issue:** On line 103, `auditService` is passed as an argument to the `Orchestrator` constructor, but it is declared with `const` on line 142 — 39 lines later. In JavaScript/TypeScript, `const` variables are in the temporal dead zone (TDZ) until their declaration is reached. Accessing `auditService` before line 142 will throw a `ReferenceError: Cannot access 'auditService' before initialization`, crashing the bootstrap process at startup.

**Fix:** Move the `auditService` initialization and `AuditService` connection before the `Orchestrator` construction. The audit service must be declared and initialized at roughly line 94, before it is referenced on line 103.

```typescript
// Before line 94 (after provider registration):
// Initialize audit service
const auditService = new AuditService();
await auditService.connect(process.env.MONGODB_URI);
console.log("✅ Audit service connected");

// Then initialize orchestrator (using auditService)
const orchestrator = new Orchestrator(memoryService, registry, identityBinding, mythicModule, sovereignHalo, auditService);

// Remove the duplicate initialization and connection at old lines 142-144.
```

---

## Warnings

### WR-01: Validation bypasses for `0`-valued options fields

**File:** `api/src/controllers/reason.ts:363-376`

**Issue:** Four validation checks use `req.options?.foo && condition` short-circuit patterns. Because `0` is falsy in JavaScript, passing `maxTokens: 0`, `temperature: 0`, or `memoryK: 0` bypasses validation entirely. These zero values can cause downstream division-by-zero or degenerate behavior (temperature=0 is actually valid for greedy decoding, but `maxTokens: 0` and `memoryK: 0` are invalid).

- Line 363: `if (req.options?.maxTokens && req.options.maxTokens < 1)` — `maxTokens: 0` passes
- Line 367: `if (req.options?.temperature && (req.options.temperature < 0 || req.options.temperature > 2))` — `temperature: 0` passes
- Line 371: `if (req.options?.memoryK && req.options.memoryK < 1)` — `memoryK: 0` passes
- Line 375: `if (req.options?.memoryAlpha && (req.options.memoryAlpha < 0 || req.options.memoryAlpha > 1))` — `memoryAlpha: 0` passes

**Fix:** Use explicit `!== undefined` checks instead of truthiness:

```typescript
// Line 363:
if (req.options?.maxTokens !== undefined && req.options.maxTokens < 1) {
  throw new Error("maxTokens must be greater than 0");
}

// Line 367:
if (req.options?.temperature !== undefined && (req.options.temperature < 0 || req.options.temperature > 2)) {
  throw new Error("temperature must be between 0 and 2");
}

// Line 371:
if (req.options?.memoryK !== undefined && req.options.memoryK < 1) {
  throw new Error("memoryK must be greater than 0");
}

// Line 375:
if (req.options?.memoryAlpha !== undefined && (req.options.memoryAlpha < 0 || req.options.memoryAlpha > 1)) {
  throw new Error("memoryAlpha must be between 0 and 1");
}
```

### WR-02: API key exposed in URL query parameter

**File:** `api/src/adapters/gemini-provider.ts:41,97,164`

**Issue:** The Gemini API key is appended as a query parameter in the URL (`?key=${this.apiKey}`) on three separate API calls (generate content, generate with tools, embed). URLs containing API keys can be leaked via:
- Server access logs / reverse proxy logs
- Referer headers if requests are redirected
- Browser history (if ever used client-side)
- Network monitoring / packet capture

Although Google's Gemini API officially supports the `key` query parameter, the `x-goog-api-key` HTTP header is the preferred approach for production environments.

**Fix:** Replace the query parameter approach with an HTTP header on all three calls:

```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": this.apiKey,
    },
    body: JSON.stringify({ ... }),
  }
);
```

### WR-03: Private member accessed via bracket notation

**File:** `api/src/services/orchestrator.ts:257,432`

**Issue:** The orchestrator accesses `this.sovereignHalo['options']?.maxAttempts` using bracket notation, breaking encapsulation. This tightly couples the orchestrator to the internal property name of `SovereignHaloService`. If the property is renamed, TypeScript will not catch the breakage. This pattern appears twice (lines 257 and 432).

```typescript
// Line 257:
const maxAttempts = this.sovereignHalo['options']?.maxAttempts || 3;
```

**Fix:** Expose a public `getMaxAttempts(): number` method on `SovereignHaloService` and use it instead:

```typescript
// On SovereignHaloService:
getMaxAttempts(): number {
  return this.options?.maxAttempts ?? 3;
}

// In Orchestrator:
const maxAttempts = this.sovereignHalo.getMaxAttempts();
```

### WR-04: Bare empty `catch` swallows errors silently

**File:** `api/src/adapters/ollama-provider.ts:132-133`

**Issue:** The `healthCheck` method has a bare `catch {}` block that silently discards all error information:

```typescript
} catch {
  return { ok: false };
}
```

When the health check fails, there is no logging output indicating why. This makes it impossible to diagnose connectivity issues, DNS failures, or timeouts without adding debug instrumentation.

**Fix:** Log the error before returning:

```typescript
} catch (error) {
  console.warn('[OllamaProvider] Health check failed:', error instanceof Error ? error.message : String(error));
  return { ok: false };
}
```

### WR-05: `defaultProvider` getter will crash on empty registry

**File:** `api/src/services/provider-registry.ts:79-81`

**Issue:** The `defaultProvider` getter unconditionally accesses `this.providers[0].provider` without checking whether the array is empty. If called before any providers are registered (e.g., during partial initialization or a misconfigured bootstrap), it will throw `TypeError: Cannot read properties of undefined (reading 'provider')`.

**Fix:** Add a guard with a descriptive error:

```typescript
get defaultProvider(): AIProvider {
  if (this.providers.length === 0) {
    throw new Error("ProviderRegistry is empty — no providers have been registered");
  }
  return this.providers[0].provider;
}
```

### WR-06: Unused variable `model` in `MockProvider.generate`

**File:** `api/src/adapters/mock-provider.ts:36`

**Issue:** `model` is destructured from `req` but never used anywhere in the method body:

```typescript
const { model, messages = [], maxTokens = 512 } = req;
```

This suggests either dead code or a missing intention to use the model name for routing responses. It also adds noise to the code.

**Fix:** Remove the unused variable:

```typescript
const { messages = [], maxTokens = 512 } = req;
```

### WR-07: `process.env.OLLAMA_URL` passed explicitly to constructor, circumventing default parameter

**File:** `api/src/bootstrap/providers.ts:19`

**Issue:** `OllamaProvider`'s constructor has a default parameter `baseUrl: string = process.env.OLLAMA_URL || "http://localhost:11434"`, but `registerProviders` explicitly passes `process.env.OLLAMA_URL`:

```typescript
const ollamaProvider = new OllamaProvider(process.env.OLLAMA_URL);
```

When `OLLAMA_URL` is not set, `process.env.OLLAMA_URL` evaluates to `undefined`. While JavaScript default parameters do trigger on `undefined`, there is an asymmetry with the constructor signature: the constructor already handles the env-var lookup internally. This means the env-var default logic lives in two places, creating a maintenance risk if one is updated but not the other.

**Fix:** Either let the constructor handle the default (don't pass the argument) or inline the fallback at the call site. The simplest fix:

```typescript
const ollamaProvider = new OllamaProvider(); // constructor handles process.env.OLLAMA_URL
```

---

## Info

### IN-01: Indentation is broken and obscures control flow

**File:** `api/src/controllers/reason.ts:199-240`

**Issue:** The brace/indentation structure in the `handleReason` method is severely inconsistent. The control flow is:

```
if (enableTools && agentBuilder) {        // line 151
    if (isTaskMode) {                     // line 158
        // task mode body
    } else {                              // lines 199-200 (else of isTaskMode)
        // tool mode body
    }                                     // line 237 (closes else)
} else {                                  // lines 238 (else of enableTools)
    orchestratorResponse = ...            // line 239
}                                         // line 240 (closes else)
```

But the indentation is:
- Line 199 at 10 spaces (should be 8)
- Line 200 `} else {` at 8 spaces (correct)
- Line 237 `}` at 6 spaces (should be 8)
- Line 238 `} else {` at 4 spaces (correct for outer level)
- Line 239 at 6 spaces (correct)
- Line 240 at 4 spaces (correct)

This makes it look like the `else` on line 238 is paired with something else, and the `else` on line 200 looks like it might close the outer `if`. A developer reading this code can easily misinterpret the logic. Format the file with Prettier to fix.

### IN-02: Module-level mutable state shared across instances

**Files:** `api/src/adapters/mock-provider.ts:3-7`, `api/src/adapters/ollama-provider.ts:3-7`

**Issue:** Both `MockProvider` and `OllamaProvider` use module-level `FORCE_FAIL` variables that are shared across all instances. If concurrent tests or requests set `FORCE_FAIL = true` on one instance, all instances are affected. This makes parallel testing and concurrent usage unreliable.

**Fix:** Move `FORCE_FAIL` to instance state (`private forceFail = false` on each class) and add per-instance setters.

### IN-03: Duplicated memory-mapping logic in `agent-builder.ts`

**File:** `api/src/services/agent-builder.ts:94-97, 171-175`

**Issue:** The `topMemories` mapping block (extracting `id`, `score`, `excerpt` from memory results) is duplicated verbatim in the non-tool path (lines 94-97) and the tool path (lines 171-175). This is a maintenance hazard — if the memory structure changes, both blocks must be updated.

**Fix:** Extract a helper method:

```typescript
private mapTopMemories(memories: VectorSearchResult[], count = 3) {
  return memories.slice(0, count).map((m) => ({
    id: m.doc.id || m.doc._id || "unknown",
    score: m.score,
    excerpt: (m.doc.content || (m.doc as any).note || "").substring(0, 150),
  }));
}
```

### IN-04: Duplicated embedding extraction logic in `orchestrator.ts`

**File:** `api/src/services/orchestrator.ts:88-90, 193-195`

**Issue:** The embedding extraction logic (handling the `Array.isArray(embedResult.embeddings[0])` branching) is duplicated identically in both `process` and `processWithTools`.

**Fix:** Extract a shared helper or consolidate the embedding step into a private method.

### IN-05: `getSchema()` method appears to be dead code

**File:** `api/src/services/mcp-client.ts:131-135`

**Issue:** The `getSchema()` method returns the discovered tools in a wrapper object but is never called anywhere in the reviewed codebase. If it's intended for external consumers, it should either be documented or removed until needed.

### IN-06: Test modifies `process.env` without restoring it

**File:** `api/src/adapters/gemini-provider.test.ts:26-31`

**Issue:** The test sets `process.env.GEMINI_API_KEY` and `process.env.GEMINI_MODEL` and then `delete`s them after the assertion. If the test fails between the set and the delete (e.g., the `expect` on line 29 throws), the environment variables leak to other tests, causing flakiness.

**Fix:** Use `beforeEach`/`afterEach` with explicit env var save/restore:

```typescript
const origApiKey = process.env.GEMINI_API_KEY;
const origModel = process.env.GEMINI_MODEL;

process.env.GEMINI_API_KEY = "env-key";
process.env.GEMINI_MODEL = "gemini-1.5-pro";
const p = new GeminiProvider();
expect(p.name).toBe("gemini");

process.env.GEMINI_API_KEY = origApiKey;
process.env.GEMINI_MODEL = origModel;
```

---

_Reviewed: 2026-06-06T00:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: standard_
