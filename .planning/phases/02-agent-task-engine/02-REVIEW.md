---
phase: 02-agent-task-engine
reviewed: 2026-06-06T19:30:00.000Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - api/openapi.yml
  - api/src/adapters/ai-adapter.ts
  - api/src/controllers/reason.test.ts
  - api/src/controllers/reason.ts
  - api/src/index.ts
  - api/src/middleware/error-handler.ts
  - api/src/middleware/version-negotiation.ts
  - api/src/services/agent-builder.integration.test.ts
  - api/src/services/agent-builder.test.ts
  - api/src/services/agent-builder.ts
  - api/src/services/mcp-client.ts
  - api/src/services/mock-agent-builder.test.ts
  - api/src/services/mock-agent-builder.ts
  - api/src/services/mock-mcp-server.ts
  - api/src/services/orchestrator.test.ts
  - api/src/services/orchestrator.ts
  - api/src/types/api-contracts.ts
findings:
  critical: 2
  warning: 5
  info: 6
  total: 13
status: issues_found
---

# Phase 02: Agent Task Engine — Code Review Report

**Reviewed:** 2026-06-06T19:30:00.000Z  
**Depth:** standard  
**Files Reviewed:** 16  
**Status:** issues_found  

## Summary

Reviewed the Agent Task Engine implementation across 16 source files covering the orchestration pipeline, agent builder, MCP client, reasoning controller, error handling, and supporting infrastructure. Found **2 critical** resource-leak/latent-crash bugs, **5 warnings** for logic errors and fragile patterns, and **6 info-level** quality observations.

The core architecture is sound, but the MCP client lifecycle has a race condition during shutdown that can leak child processes, and the legacy `orchestrateReasoning` export creates an unconnected MemoryService that would crash at first use.

---

## Critical Issues

### CR-01: MCP client shutdown races with crash handler — unwanted restart leaks child processes

**File:** `api/src/services/mcp-client.ts:79–83, 142–153, 193–206`

**Issue:**  
When `stop()` kills the server process (SIGTERM), the `exit` event fires synchronously on the `ChildProcess` object. The exit handler (line 79) calls `this.handleCrash()` (line 82), which schedules an automatic restart via `setTimeout` (line 198). Meanwhile `stop()` has already set `this.isRunning = false` and `this.process = undefined` (lines 151–152). When the restart timeout fires, `start()` sees `isRunning === false` and spawns a brand-new MCP server process — creating a zombie process that is never tracked or cleaned up.

**Sequence of events:**
1. `stop()` → `process.kill("SIGTERM")`
2. Exit event fires → `handleCrash()` → `setTimeout(start, 2000)` is scheduled
3. `stop()` sets `this.process = undefined`, `this.isRunning = false`
4. After 2s, `start()` spawns a new process because `isRunning` is false

**Fix:**  
Guard `handleCrash()` so it does not schedule a restart during intentional shutdown. The simplest fix is to add a `shuttingDown` flag:

```typescript
// In MCPClient class, add field:
private shuttingDown = false;

// In stop():
async stop(): Promise<void> {
  this.shuttingDown = true;  // <-- ADD
  if (this.process && !this.process.killed) {
    this.process.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!this.process.killed) {
      this.process.kill("SIGKILL");
    }
  }
  this.isRunning = false;
  this.process = undefined;
}

// In handleCrash():
private handleCrash(): void {
  if (this.shuttingDown) return;  // <-- ADD
  if (this.restartAttempts < this.maxRestarts) {
    // ... existing restart logic
  }
}
```

---

### CR-02: Legacy `orchestrateReasoning` creates unconnected MemoryService — latent crash

**File:** `api/src/services/orchestrator.ts:539–560`

**Issue:**  
The exported legacy function `orchestrateReasoning` creates a new `MemoryService()` instance at line 541 **without** calling `.connect()` first. The bootstrap sequence in `index.ts:60–61` shows the required pattern:

```typescript
const memoryService = new MemoryService();
await memoryService.connect(process.env.MONGODB_URI);
```

The first call to `memoryService.vectorSearch()` on an unconnected instance will fail, likely throwing a connection error. This function is exported and could be called by external consumers or future refactors.

**Fix:**  
Either remove this dead legacy export entirely, or accept an already-connected `MemoryService` as a parameter:

```typescript
// Option A: Remove dead code
// Delete lines 538–560 entirely

// Option B: Accept pre-connected dependencies
export async function orchestrateReasoning(
  req: any,
  memoryService: MemoryService,
  registry?: ProviderRegistry
) {
  const registry = registry || ProviderRegistry.instance;
  const orchestrator = new Orchestrator(memoryService, registry);
  // ...
}
```

---

## Warnings

### WR-01: Express middleware returns 400 for ALL errors, including internal ones

**File:** `api/src/controllers/reason.ts:427–431`

**Issue:**  
The `createReasonRouter` function catches all errors thrown by the controller and returns them as HTTP 400 Bad Request. Validation errors (from `validateRequest`) should be 400, but unexpected runtime errors (orchestrator failures, provider timeouts, etc.) should be 500 Internal Server Error. Masking them as 400 breaks HTTP semantics and makes operational debugging harder.

```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : "Internal server error";
  res.status(400).json({    // ← always 400, even for 500-class errors
    error: message,
    timestamp: new Date().toISOString(),
  });
}
```

**Fix:**  
Distinguish between client errors (validation) and server errors, or delegate to the centralized `errorHandler` middleware instead of catching here:

```typescript
} catch (error) {
  // Delegate to the centralized error handler
  next(error);
}
```

Alternatively, classify by error type:

```typescript
} catch (error) {
  const isValidation = error instanceof Error && (
    error.message.includes("identity_anchor") ||
    error.message.includes("messages array")
  );
  res.status(isValidation ? 400 : 500).json({
    error: error instanceof Error ? error.message : "Internal server error",
    timestamp: new Date().toISOString(),
  });
}
```

---

### WR-02: Fragile string matching classifies tool/MCP errors

**File:** `api/src/middleware/error-handler.ts:184–195`

**Issue:**  
The error handler classifies MCP and tool errors by checking if `err.message.includes("MCP")` or `err.message.includes("tool")`. Any error message that happens to contain the substring "tool" (e.g., `"this is a useful tool for debugging"`, `"toolkit version mismatch"`) will be misclassified as `MCP_SERVER_ERROR` with HTTP 422, even if it has nothing to do with MCP.

```typescript
if (err.message && (
  err.message.includes("MCP") ||
  err.message.includes("tool")
)) {
```

**Fix:**  
Use an explicit error code or class hierarchy instead of string matching. The `AetheriumError` class already exists — have `MCPClient` and `AgentBuilder` throw typed errors:

```typescript
// Use the existing AetheriumError with ErrorCode
throw new AetheriumError(ErrorCode.MCP_SERVER_ERROR, "Connection timeout", {
  cause: originalError,
});
```

Then the error handler only needs `instanceof AetheriumError` (which it already handles on line 149) — the string-matching blocks become unnecessary.

---

### WR-03: Plan status incorrectly reports "completed" when iteration limit truncates steps

**File:** `api/src/services/agent-builder.ts:238, 327–329`

**Issue:**  
The `executeTask` loop limits steps to `maxIterations` (line 238), but the planStatus computation (lines 327–329) only checks `failedSteps === 0` to determine "completed". If a plan has 5 steps but `maxTaskIterations` is 2, only 2 steps execute. Both succeed, so `failedSteps = 0`, `planStatus = "completed"` — but only 2/5 steps were actually attempted.

**Fix:**  
Compare `completedSteps` against the full `plan.steps.length`, not just against zero failed steps:

```typescript
const allStepsAttempted = completedSteps + failedSteps >= plan.steps.length;
const planStatus: "completed" | "partial" | "failed" =
  allStepsAttempted && failedSteps === 0 ? "completed" :
  completedSteps > 0 ? "partial" : "failed";
```

---

### WR-04: ReflectiveService instantiated internally (DI violation)

**File:** `api/src/services/orchestrator.ts:65`

**Issue:**  
The `Orchestrator` constructor creates its own `ReflectiveService` instance (line 65) rather than receiving it via dependency injection. This makes the orchestrator harder to unit-test (tests must use `jest.mock` at the module level instead of injecting a mock) and couples the orchestrator to a specific implementation.

```typescript
this.reflectiveService = new ReflectiveService();  // hard-coded dependency
```

**Fix:**  
Accept `reflectiveService` as an optional constructor parameter (defaulting to `new ReflectiveService()` if not provided):

```typescript
constructor(
  memoryService: MemoryService,
  providerRegistry: ProviderRegistry,
  identityBinding?: IdentityBindingService,
  mythicModule?: MythicModule,
  sovereignHalo?: SovereignHaloService,
  auditService?: AuditService,
  reflectiveService?: ReflectiveService  // <-- ADD
) {
  this.reflectiveService = reflectiveService || new ReflectiveService();
  // ...
}
```

---

### WR-05: AgentBuilder silently falls back to standard reasoning when tools are empty

**File:** `api/src/services/agent-builder.ts:70`

**Issue:**  
When `this.tools.length === 0` (e.g., MCP discovery returned no tools), tools are enabled, and MCP is healthy, the code silently falls through to the standard reasoning path without any log or warning. A user who explicitly enabled tools would get a non-tool response with no indication why.

```typescript
if (!effectiveConfig.enableTools || !this.mcpClient.isHealthy() || this.tools.length === 0) {
  // Standard reasoning path — no indication to the caller that tools were expected but unavailable
```

**Fix:**  
Add a warning log when tools are expected but unavailable:

```typescript
if (!effectiveConfig.enableTools || !this.mcpClient.isHealthy() || this.tools.length === 0) {
  if (effectiveConfig.enableTools && this.tools.length === 0) {
    console.warn('[AgentBuilder] Tools enabled but no tools discovered — falling back to standard reasoning');
  }
  // Standard reasoning path...
```

---

## Info

### IN-01: Missing `id: null` in JSON-RPC parse error response

**File:** `api/src/services/mock-mcp-server.ts:56–59**

**Issue:**  
The parse error response omits the `id` field. Per JSON-RPC 2.0 §5.1, parse error responses MUST include `"id": null`. The current response:

```typescript
console.log(JSON.stringify({
  jsonrpc: "2.0",
  error: { code: -32700, message: "Parse error" },
}));
```

When `id` is absent, `MCPClient.handleResponse` calls `this.pendingRequests.get(undefined)`, which returns `undefined`, so the error is silently dropped and the pending request Promise is never settled.

**Fix:**  
```typescript
console.log(JSON.stringify({
  jsonrpc: "2.0",
  id: null,
  error: { code: -32700, message: "Parse error" },
}));
```

---

### IN-02: Keyword matching heuristic may produce false positives for task mode detection

**File:** `api/src/controllers/reason.ts:390–403`

**Issue:**  
The auto-detection heuristic uses `String.includes()` for substring matching, which can match words embedded in other words. For example:
- The keyword `"then"` matches within `"authenticate"`, `"ether"`, `"hypothenar"`
- The verb `"find"` matches within `"findings"`, `"refind"`, `"windfinder"`

This could incorrectly classify simple queries as task mode.

**Fix:**  
Use word-boundary matching: `queryText.split(/\b/).includes(keyword)` or regex with `\b` anchors.

---

### IN-03: Duplicate `ToolCall` type definition across files

**File:** `api/src/types/api-contracts.ts:77–81` and `api/src/adapters/ai-adapter.ts:26–30`

**Issue:**  
The `ToolCall` interface is defined identically in two places. This creates a maintenance burden — changes to one must be manually mirrored in the other, or types will drift apart.

**Fix:**  
Define `ToolCall` once (e.g., in `api-contracts.ts`) and import it where needed.

---

### IN-04: Misleading indentation in if/else block

**File:** `api/src/controllers/reason.ts:238–240**

**Issue:**  
The `else` branch body and closing brace are indented at the same level as the outer scope, making it appear that the assignment is outside the if/else. While functionally correct (the `{ }` delimiters are properly placed), it is confusing to read:

```typescript
      } else {
      orchestratorResponse = await this.orchestrator.process(orchestratorReq);
    }
```

**Fix:**  
Correct the indentation:

```typescript
      } else {
        orchestratorResponse = await this.orchestrator.process(orchestratorReq);
      }
```

---

### IN-05: Hardcoded model name inconsistency

**File:** `api/src/services/orchestrator.ts:229, 276, 407`

**Issue:**  
The `process()` path (via `generateAndValidate`) uses `model: 'demo'` (line 407), while `processWithTools()` uses `model: 'gemini-1.5-pro'` (lines 229, 276). If the provider uses model name to select capabilities or endpoints, this inconsistency could produce different behavior between the two code paths.

**Fix:**  
Make the model name configurable (e.g., from environment or an orchestrator config option) so both paths use the same value.

---

### IN-06: Unused `mockReflectiveService` variable in orchestrator test

**File:** `api/src/services/orchestrator.test.ts:47–50**

**Issue:**  
`mockReflectiveService` is instantiated as a `jest.Mocked<ReflectiveService>` but never used — the orchestrator creates its own internal `ReflectiveService` instance (line 65 of orchestrator.ts). The module-level `jest.mock('./reflective-service')` (line 9) and the `mockImplementation` on line 48 are the effective mocks. The `mockReflectiveService` variable is dead code.

**Fix:**  
Remove the unused variable, or if testing the injected service, first refactor Orchestrator to accept DI (see WR-04).

---

_Reviewed: 2026-06-06T19:30:00.000Z_  
_Reviewer: OpenCode (gsd-code-reviewer)_  
_Depth: standard_
