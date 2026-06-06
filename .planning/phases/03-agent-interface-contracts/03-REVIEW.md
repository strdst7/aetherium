---
status: issues_found
files_reviewed: 12
depth: standard
findings:
  critical: 4
  warning: 6
  info: 4
  total: 14
---

# Phase 03: Agent Interface & Contracts — Code Review Report

**Reviewed:** 2026-06-06T12:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 03 implements the API contract layer — OpenAPI specification, TypeScript contract types, Express route handlers, error formatting, version negotiation, and validation middleware. The overall structure is reasonable, but four critical defects were found: the health endpoint is functionally broken (always returns `"ok"` regardless of actual dependency health), error responses from `/v1/reason` don't match the published OpenAPI spec, a circular dependency chain exists between services and controllers, and the OpenAPI spec is missing a response field the controller actually returns. Additionally, several warnings around type duplication, fragile patterns, and unused code were identified.

## Critical Issues

### CR-01: Health endpoint never checks service dependencies (dead code)

**File:** `api/src/index.ts:52`
**File:** `api/src/routes/health.ts:19`

**Issue:** The `/health` route is registered twice. The first registration at `index.ts:52` (`app.get("/health", ...)`) is a simple handler that always replies `{ status: "ok" }` without checking any dependencies. It is registered before `bootstrap()` runs. The second registration at `index.ts:170` (`app.use("/", createHealthRouter(...))`) inside `bootstrap()` creates a router with a comprehensive health check that actually tests database, LLM, and MCP connectivity.

Since Express runs the first matching handler, the simple handler at line 52 always responds to `/health` requests, and the comprehensive handler inside the router is **never reached**. All health responses unconditionally report `status: "ok"` regardless of actual service health. This defeats the purpose of a health endpoint — a degraded or down service will be reported as healthy.

**Fix:** Remove the duplicate inline handler at `index.ts:52-54` and let the router from `createHealthRouter()` handle `/health` exclusively.

```typescript
// Remove lines 52-54 entirely:
// app.get("/health", (req, res) => {
//   res.json({ status: "ok", timestamp: new Date().toISOString() });
// });
```

The router at line 170 (`app.use("/", createHealthRouter(...))`) will then serve `/health` with the full dependency check.

---

### CR-02: `/v1/reason` error responses violate OpenAPI spec

**File:** `api/src/index.ts:157-161`
**File:** `api/openapi.yml:176-188`

**Issue:** The OpenAPI specification defines error responses for `/v1/reason` using the `ProblemDetails` schema (RFC 7807) with fields `type`, `title`, `status`, `detail`, `instance`, `apiVersion`, and optional `errors`. However, the error handler in the `/v1/reason` route (`index.ts:152-163`) catches errors and returns a custom error format:

```json
{
  "error": "identity_anchor is required and must be a string",
  "timestamp": "2026-06-06T12:00:00.000Z"
}
```

This does **not** match the `ProblemDetails` schema. Downstream clients following the OpenAPI contract will not find `type`, `title`, `status`, `detail`, or `apiVersion` in the error response, which breaks contract compatibility. The global `errorHandler` middleware (`error-handler.ts:143`) correctly produces `ProblemDetails`, but the `/v1/reason` route catches its own errors before the global handler can translate them.

**Fix:** Remove the inline try/catch in the `/v1/reason` route and let errors propagate to the global `errorHandler` middleware, or convert the error response to `ProblemDetails` format.

Option A — let errors propagate:
```typescript
app.post("/v1/reason", async (req, res, next) => {
  const response = await reasonController.handleReason(req.body);
  res.json(response);
});
```

Option B — use ProblemDetails format in the catch:
```typescript
res.status(400).json({
  type: "https://api.aetherium.io/errors/invalid-request",
  title: "Invalid Request",
  status: 400,
  detail: message,
  instance: req.originalUrl,
  apiVersion: CURRENT_API_VERSION,
});
```

---

### CR-03: Circular dependency chain orchestator.ts ↔ reason.ts ↔ agent-builder.ts

**File:** `api/src/services/orchestrator.ts:5`
**File:** `api/src/controllers/reason.ts:1`
**File:** `api/src/services/agent-builder.ts:1,3`

**Issue:** Services should depend on controllers, not the other way around. The current code has:

- `orchestrator.ts:5` — `import { TaskPlan, PlanStep } from '../controllers/reason'`
- `agent-builder.ts:3` — `import { ReasonRequest, ReasonResponse, TaskPlan, PlanStep, Action, ActionType } from '../controllers/reason'`
- `reason.ts:1` — `import { Orchestrator } from '../services/orchestrator'`
- `reason.ts:3` — `import { AgentBuilder } from '../services/agent-builder'`

This creates a circular dependency chain:
```
orchestrator.ts → reason.ts → agent-builder.ts → orchestrator.ts
```

While TypeScript can resolve circular type imports at compile time, this pattern is architecturally unsound. At runtime, if any of these imports carry side effects (class initializers, module-level state, etc.), the circular dependency can cause `undefined` references. More importantly, it violates the principle that controllers depend on services, not vice versa.

**Fix:** Move the shared types (`TaskPlan`, `PlanStep`, `Action`, `ActionType`, `ReasonRequest`, `ReasonResponse`) out of the controller and into `api-contracts.ts`. All three files should import from the shared contract types instead of from each other.

```typescript
// orchestrator.ts — remove line 5, import from api-contracts instead
import { TaskPlan, PlanStep } from '../types/api-contracts';

// agent-builder.ts — remove line 3, import from api-contracts instead
import { ReasonRequest, ReasonResponse, TaskPlan, PlanStep, Action, ActionType } from '../types/api-contracts';

// reason.ts — keep service imports but remove local type definitions
// Delete local interface definitions for ReasonRequest, ReasonResponse, etc.
```

---

### CR-04: OpenAPI spec missing `identity` field in ReasonResponse

**File:** `api/openapi.yml:1157-1208`
**File:** `api/src/controllers/reason.ts:86-91`

**Issue:** The `ReasonResponse` in the OpenAPI specification (`openapi.yml` lines 1157-1208) does not include the `identity` field. However, the controller's `ReasonResponse` type (`reason.ts` lines 86-91) and the actual response construction (`reason.ts` lines 317-323) return an `identity` object containing `id`, `name`, and `version`. This means the API contract documents a response shape that differs from what the implementation actually returns — a contract violation.

Clients using code generation from the OpenAPI spec will not expect the `identity` field, and may silently ignore it or fail to access it. Additionally, the OpenAPI spec should document this field so consumers know it's available.

**Fix:** Add the `identity` field to the `ReasonResponse` schema in `openapi.yml`:

```yaml
ReasonResponse:
  type: object
  required:
    - id
    - output
    - status
    - identity_anchor
    - reasoning
    - apiVersion
  properties:
    # ... existing properties ...
    identity:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        version:
          type: integer
      description: Identity binding information (present when identity is resolved)
```

---

## Warnings

### WR-01: Potential `TypeError` from optional chaining + `.catch()` on undefined

**File:** `api/src/routes/health.ts:30`

**Issue:** The expression `options.memoryService.vectorSearch?.([0], 0.5, 1).catch(...)` uses optional chaining (`?.`) before `.catch()`. If `vectorSearch` is `undefined` (not a method), optional chaining returns `undefined`, and then `.catch()` is called on `undefined`, throwing a `TypeError: Cannot read properties of undefined (reading 'catch')`. This error propagates to the outer `catch` block at line 33, which sets `checks.database = "error"` — so the behavior is accidentally correct, but the code path is fragile and relies on the outer catch to handle a programming error.

**Fix:** Apply the `.catch()` to the result of the optional call directly, or use a different pattern:

```typescript
try {
  const result = options.memoryService.vectorSearch
    ? await options.memoryService.vectorSearch([0], 0.5, 1)
    : null;
} catch {
  checks.database = "error";
}
```

Or more concisely:
```typescript
await options.memoryService.vectorSearch?.([0], 0.5, 1).catch(() => {
  checks.database = "error";
});
```
This is NOT sufficient because the `.catch` is chained to the return of `?.()`, not to the expression itself. Instead do:
```typescript
const result = options.memoryService.vectorSearch?.([0], 0.5, 1);
if (result) await result.catch(() => { checks.database = "error"; });
```

Or wrap the whole thing in try/catch.

---

### WR-02: Type duplication — controller defines its own request/response types

**File:** `api/src/controllers/reason.ts:12-91`

**Issue:** The `reason.ts` controller defines its own set of types — `ReasonRequest`, `ReasonResponse`, `Action`, `PlanStep`, `TaskPlan`, `PlanStatus`, `ActionType`, `ReasoningTrace`, `ToolExecutionTrace` — that duplicate the types already defined in `api-contracts.ts`. This creates two sources of truth for the API contract. Any change to one file that is not mirrored in the other will cause silent type drift, where the controller's response shape diverges from the published contract.

Additionally, the controller's `ToolExecutionResult` is imported from `../services/mcp-client` (line 5), while `api-contracts.ts` defines its own local `ToolExecutionResult` (lines 79-83). If the MCP client's type signature changes, the controller's response will change but the contract type will not.

**Fix:** Remove the local type definitions from `reason.ts` and import them from `../types/api-contracts`. This ensures a single source of truth.

```typescript
// At the top of reason.ts, replace local definitions with:
import {
  ReasonRequest,
  ReasonResponse,
  PlanStep,
  TaskPlan,
  Action,
  PlanStatus,
  ReasoningTrace,
  ToolExecutionTrace,
  ToolExecutionResult,
  ActionType,
} from '../types/api-contracts';
```

Then delete lines 8-91 from `reason.ts`.

---

### WR-03: `addVersionToResponse` mutates response body in place

**File:** `api/src/middleware/version-negotiation.ts:67-72`

**Issue:** The `addVersionToResponse` middleware monkey-patches `res.json` to add `apiVersion` to the response body by mutating it in place (`body.apiVersion = ...`). In-place mutation of the response body can cause side effects:

1. If the response body object is reused by the caller (e.g., constructed once and cached), subsequent uses will have a stale `apiVersion` value.
2. If the response body is frozen (`Object.freeze()`), this will silently fail (no error in non-strict mode).
3. If the response body is `null`, the check `body && typeof body === "object"` correctly guards against it.
4. If the response body is an array (`[]`), `typeof [] === "object"` is true, and `body.apiVersion = "1.0.0"` will add a non-index property to the array (allowed but surprising).

**Fix:** Create a new object instead of mutating:

```typescript
res.json = function(body: any): Response {
  if (body !== null && typeof body === "object" && !Array.isArray(body) && !body.apiVersion) {
    return originalJson({ ...body, apiVersion: req.apiVersion || CURRENT_API_VERSION });
  }
  return originalJson(body);
};
```

---

### WR-04: API path versioning inconsistency

**File:** `api/openapi.yml:353-780`

**Issue:** The API paths use inconsistent versioning:
- `/v1/reason`, `/v1/memory/search`, `/v1/memory/upsert`, `/v1/info`, `/v1/multi-agent/reason` — use `/v1` prefix
- `/identity/register`, `/identity`, `/identity/{id}`, `/identity/{id}/versions`, `/audit` — **no** `/v1` prefix

This means identity and audit endpoints bypass the version negotiation middleware's path-based logic (version negotiation works via headers, so runtime behavior is fine). However, for consumers reading the OpenAPI spec, this inconsistency is confusing and suggests the unversioned endpoints are not subject to the same API lifecycle governance.

**Fix:** Add `/v1` prefix to identity and audit endpoints:

```yaml
/v1/identity/register:
  post:
    # ...
/v1/identity:
  get:
    # ...
/v1/identity/{id}:
  get:
    # ...
/v1/audit:
  get:
    # ...
```

Or only serve versioned routes and remove unversioned ones.

---

### WR-05: Unused validation middleware

**File:** `api/src/middleware/openapi-validator.ts:161-200`

**Issue:** The `validateRequestMiddleware` (line 161) and `validateResponseMiddleware` (line 178) are exported but never registered in any route in `index.ts`. The middleware provides runtime validation of requests and responses against the OpenAPI schema, but it's effectively dead code. The request validation logic in `validateReasonRequest` is duplicated in `reason.ts`'s `validateRequest` method (lines 348-377), meaning the validator is likely what was intended but the middleware was never wired up.

**Fix:** Either register the middleware on the `/v1/reason` route in `index.ts`:

```typescript
import { validateRequestMiddleware, validateResponseMiddleware } from "./middleware/openapi-validator";

app.post("/v1/reason", validateRequestMiddleware, async (req, res) => {
  // ...
});
// After all routes:
app.use(validateResponseMiddleware);
```

Or remove the unused middleware and note that validation is handled in the controller directly.

---

### WR-06: Fragile memory ID extraction with type escape

**File:** `api/src/controllers/reason.ts:286-288`

**Issue:** The memory-to-topMemories mapping uses a fragile fallback chain for ID extraction and a type-unsafe `as any` cast:

```typescript
id: m.doc.id || m.doc._id || "unknown",
excerpt: (m.doc.content || (m.doc as any).note || "").substring(0, 150),
```

This silently produces `"unknown"` for any document that lacks both `id` and `_id`, masking data issues. The `as any` cast at line 288 bypasses TypeScript's type checking entirely — if `m.doc` is structured differently (e.g., the document schema changes from `note` to `summary`), there is no compile-time error, just a silent empty string at runtime.

**Fix:** Define a proper extraction interface or guard:

```typescript
function extractDocId(doc: any): string {
  if (typeof doc?.id === 'string') return doc.id;
  if (typeof doc?._id === 'string') return doc._id;
  if (typeof doc?._id?.toString === 'function') return doc._id.toString();
  return "unknown";
}

function extractDocContent(doc: any): string {
  return doc?.content || doc?.note || "";
}

const topMemories = orchestratorResponse.context.relevantMemories.slice(0, 3).map((m) => ({
  id: extractDocId(m.doc),
  score: m.score,
  excerpt: extractDocContent(m.doc).substring(0, 150),
}));
```

Then add logging for the `"unknown"` fallback case to detect schema drift.

---

## Info

### IN-01: OpenAPI security scheme defined but not enforced

**File:** `api/openapi.yml:1850-1856`

The `bearerAuth` security scheme is defined in the `components/securitySchemes` section, but `security: []` at line 1856 means no endpoint requires authentication. The scheme definition is speculative/housekeeping — it documents what could be used but doesn't actually apply to any endpoint. Consider either removing it until auth is implemented or adding `security: [{ bearerAuth: [] }]` to specific endpoints that require it.

---

### IN-02: `addVersionToResponse` affects array responses

**File:** `api/src/middleware/version-negotiation.ts:67-68`

The monkey-patched `res.json` only checks `typeof body === "object"`, which includes arrays. For array responses, `body.apiVersion = "1.0.0"` adds a non-index property to the array. While this is valid JavaScript, it is at best harmless and at worst confusing. Add `!Array.isArray(body)` to the guard condition (as suggested in WR-03 fix).

---

### IN-03: `api-contracts.ts` does not export multi-agent types

**File:** `api/src/types/api-contracts.ts`

The file re-exports identity, halo, and audit types but does not define or re-export multi-agent request/response types (`MultiAgentReasonRequest`, `MultiAgentReasonResponse`). The OpenAPI spec defines these schemas, and downstream consumers would benefit from having TypeScript types for them.

---

### IN-04: Hardcoded default values and magic numbers

**File:** `api/src/controllers/reason.ts:131,132,209`

Default values like `512`, `0.7`, `0.5`, `5`, `20` are hardcoded throughout the controller and OpenAPI spec without named constants. While defaults in the OpenAPI schema (`default: 512`, `default: 0.7`) are expected, the controller duplicates these values (e.g., `maxTokens: req.options?.maxTokens || 512`). If the OpenAPI defaults change, the controller's defaults must be updated in sync. Define shared constants or extract defaults from the OpenAPI schema at compile time.

---

_Reviewed: 2026-06-06T12:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: standard_
