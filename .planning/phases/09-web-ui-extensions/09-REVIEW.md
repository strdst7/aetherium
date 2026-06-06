---
phase: 09-web-ui-extensions
reviewed: 2026-06-07T12:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - web/src/lib/api-client.ts
  - web/src/types/api.ts
  - web/components/IdentitySelector.tsx
  - web/components/Layout.tsx
  - web/components/IdentityForm.tsx
  - web/components/ReasoningTrace.tsx
  - web/components/ValidationReport.tsx
  - web/pages/index.tsx
  - web/pages/identity/register.tsx
  - web/pages/memory.tsx
findings:
  critical: 0
  warning: 8
  info: 7
  total: 15
status: issues_found
---

# Phase 09: Code Review Report — Web UI Extensions

**Reviewed:** 2026-06-07T12:00:00Z
**Depth:** Standard (per-file + cross-file + cross-repo)
**Files Reviewed:** 10
**Status:** Issues Found

## Summary

Reviewed 10 source files comprising the Web UI Extensions phase: shared API types (`api.ts`), the API client layer (`api-client.ts`), five UI components (`IdentitySelector`, `Layout`, `IdentityForm`, `ReasoningTrace`, `ValidationReport`), and three pages (`index`, `identity/register`, `memory`).

Cross-referenced all API calls against backend controller implementations (`api/src/controllers/audit.ts`, `api/src/controllers/memory.ts`, `api/src/controllers/failover.ts`) and backend type contracts (`api/src/types/audit.ts`).

**Key concerns:**
- The memory page (`memory.tsx`) uses hardcoded `http://localhost:8080` URLs that will break in production
- Multiple potential runtime crashes from unchecked optional access on API response fields (trace results, embeddings, confidence scores)
- Fire-and-forget `fetch()` calls in demo buttons with unhandled promise rejections
- No input length validation on the identity registration form — unbounded string submission
- Pervasive `any` type assertions in the memory visualization page, bypassing the type system

No BLOCKER issues found after cross-referencing — the `identity_id` vs `identityId` naming inconsistency is endpoint-correct (both backends use their respective conventions).

---

## Warnings

### WR-01: Hardcoded production URL in memory page

**File:** `web/pages/memory.tsx:45-47`
**Issue:** The memory trace endpoint URL is hardcoded to `http://localhost:8080` instead of using the `NEXT_PUBLIC_API_URL` environment variable. This will fail in any non-local deployment (staging, production). The identity map `getMemoryShards()` call on line 62 correctly uses the `api-client` layer which reads the env var, but the direct `fetch()` on lines 45-47 bypasses the client entirely.

```typescript
// Lines 45-47 — HARDCODED
const url = selectedIdentity
  ? `http://localhost:8080/v1/memory/trace?query=${encodeURIComponent(query)}&identityId=${encodeURIComponent(selectedIdentity)}`
  : `http://localhost:8080/v1/memory/trace?query=${encodeURIComponent(query)}`;
```

**Fix:** Import `API_BASE` from `api-client.ts` (or re-read the env var) and construct the URL dynamically. Ideally add a `traceMemoryQuery` function to `api-client.ts` instead of inlining `fetch()`:

```typescript
// Add to api-client.ts
export async function traceMemoryQuery(
  query: string,
  identityId?: string
): Promise<{ embedding: number[]; results: any[] }> {
  const params = new URLSearchParams({ query });
  if (identityId) params.append('identityId', identityId);
  return fetchJSON(`/v1/memory/trace?${params.toString()}`);
}
```

### WR-02: Missing null/undefined guard on `trace.embedding`

**File:** `web/pages/memory.tsx:234`
**Issue:** `trace.embedding.slice(0, 5)` will crash if `trace.embedding` is undefined or null. The API response type for the trace endpoint includes `embedding` but if the endpoint errors partially or the response format changes, this produces an uncaught runtime error.

```typescript
{trace.embedding.slice(0, 5).map((v: number) => v.toFixed(3)).join(", ")} ...
```

**Fix:** Guard with optional chaining and provide a fallback:

```typescript
{trace.embedding?.slice(0, 5)?.map((v: number) => v.toFixed(3)).join(", ") ?? "N/A"} ...
```

### WR-03: Missing null/undefined guard on `trace.results`

**File:** `web/pages/memory.tsx:246`
**Issue:** `trace.results.map(...)` will crash if `trace.results` is undefined or null. Same root cause as WR-02 — unchecked access on an API response field.

```typescript
{trace.results.map((r: any) => (
```

**Fix:** Guard with optional chaining and conditional rendering:

```typescript
{trace.results?.map((r: any) => (
```

And add an empty state before the table:

```typescript
{trace.results?.length === 0 && <p>No results found.</p>}
```

### WR-04: Unhandled promise rejections in demo force-fail buttons

**File:** `web/pages/index.tsx:92-93`
**Issue:** The "Simulate Provider Failure" and "Restore Provider" buttons fire `fetch()` calls without handling promise rejections. If the server is unreachable, the rejected promise is unhandled (Node.js will log `UnhandledPromiseRejection` in dev, and in production this could crash the render).

```typescript
<button onClick={() => fetch(`${apiUrl}/api/forceFail?on=true`)} style={styles.demoButton}>Simulate Provider Failure</button>
<button onClick={() => fetch(`${apiUrl}/api/forceFail?on=false`)} style={styles.demoButton}>Restore Provider</button>
```

**Fix:** Add error handling (even if silent for demo buttons):

```typescript
const handleForceFail = async (on: boolean) => {
  try {
    await fetch(`${apiUrl}/api/forceFail?on=${on}`);
  } catch (err) {
    console.warn('Force-fail toggle failed (server may be down):', err);
  }
};
```

### WR-05: Potential "NaN%" display for confidence score

**File:** `web/pages/index.tsx:249`
**Issue:** `response.reasoning.reflective.confidenceScore` is typed as `number` (required) in the `ReasoningResponse` inline type. If the API omits this field or returns `null` at runtime (due to a processing error), `undefined * 100` produces `NaN`, and `NaN.toFixed(0)` produces `"NaN"`, rendering as `"NaN%"` in the UI.

```typescript
<strong>Confidence:</strong> {(response.reasoning.reflective.confidenceScore * 100).toFixed(0)}%
```

**Fix:** Use a numeric fallback:

```typescript
<strong>Confidence:</strong> {((response.reasoning.reflective.confidenceScore ?? 0) * 100).toFixed(0)}%
```

### WR-06: Pervasive `any` type assertions in memory visualization

**File:** `web/pages/memory.tsx:65,73,168,246`
**Issue:** Multiple places use `as any` type assertions, bypassing TypeScript's type safety. The `MemoryDocument` type exists in `api.ts` with `id`, `content`, `metadata`, `score`, `createdAt` fields, but the code accesses `d.embedding`, `r.doc.id`, `r.doc.metadata`, etc. through `any`, losing all compile-time guarantees.

```typescript
// Line 65
const docsWithEmbeddings = docs.filter((d: any) => d.embedding && Array.isArray(d.embedding));
// Line 73
const embeddings = docsWithEmbeddings.map((d: any) => d.embedding);
```

**Fix:** Define a proper interface for memory documents with embeddings and for trace results, instead of using `any`:

```typescript
interface MemoryDocWithEmbedding extends MemoryDocument {
  embedding: number[];
}

interface TraceResult {
  doc: MemoryDocWithEmbedding;
  score: number;
}
```

### WR-07: No input length validation on IdentityForm

**File:** `web/components/IdentityForm.tsx` (all form fields)
**Issue:** None of the form fields (name, developerId, voice, constraints, mythicSignature, allowedBehaviors, forbiddenBehaviors) have maximum length validation. A user could submit multi-megabyte strings that would consume excessive memory and bandwidth, potentially triggering backend request size limits or denial-of-service.

**Fix:** Add `maxLength` constraints to each `FormField` and client-side validation:

```typescript
// In handleSubmit validation:
if (formData.name.trim().length > 200) errors.name = 'Name must be 200 characters or less';
if (formData.developerId.trim().length > 100) errors.developerId = 'Developer ID must be 100 characters or less';
```

And add `maxLength={200}` to the `<input>` and `<textarea>` elements in `FormField`.

### WR-08: `fetchJSON` lacks request timeout

**File:** `web/src/lib/api-client.ts:17-33`
**Issue:** The `fetchJSON` utility function has no timeout mechanism. If the API server hangs (e.g., due to a long-running reasoning request or network issue), the fetch will remain pending indefinitely, and the UI will show a loading spinner forever with no way to recover.

**Fix:** Add an `AbortController` with a configurable timeout:

```typescript
async function fetchJSON<T>(path: string, options?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const timeout = options?.timeoutMs ?? 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '1.0.0',
        ...options?.headers,
      },
    });
    // ... rest unchanged
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

## Info

### IN-01: Unused types in `api.ts`

**File:** `web/src/types/api.ts`
**Issue:** Three exported types are never imported or used in any of the 10 reviewed files:
- `IdentityVersion` (lines 20-27)
- `FailureReport` (lines 64-72)
- `ReflectiveCheckResult` (lines 124-129)

These may be used by other files outside the review scope, but within these files they are dead code.

**Suggestion:** Either remove unused exports or verify they are consumed by other modules (e.g., test files, future components). The `FailureReport` type in particular duplicates the inline `failureReport` field shape in `ReasoningResponse`, risking drift.

### IN-02: Duplicated `apiUrl` constant

**File:** `web/pages/index.tsx:47`
**Issue:** The `apiUrl` constant duplicates the `API_BASE` constant from `api-client.ts:15` with identical logic:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
```

**Suggestion:** Export `API_BASE` from `api-client.ts` and import it here, or read `NEXT_PUBLIC_API_URL` directly. Eliminates duplication risk.

### IN-03: Dual `value` / `selectedId` props in `IdentitySelector`

**File:** `web/components/IdentitySelector.tsx:7-13`
**Issue:** The component accepts both `value` and `selectedId` for the same purpose:
```typescript
interface IdentitySelectorProps {
  value?: string;
  selectedId?: string;
  onChange: (value: string) => void;
  ...
}
```
Usage is inconsistent across the codebase:
- `Layout.tsx:51` passes `value={selectedIdentity}`
- `index.tsx:106` passes `selectedId={identityAnchor}`
- `memory.tsx:132` passes `selectedId={selectedIdentity}`

**Suggestion:** Keep only one prop (e.g., `value`) and standardize all call sites. Using two aliases for the same thing is confusing and risks subtle bugs if the precedence logic (`value ?? selectedId`) isn't well understood.

### IN-04: Inline DOM event handlers in `NavLink`

**File:** `web/components/Layout.tsx:70-93`
**Issue:** The `NavLink` component uses React `onMouseEnter`/`onMouseLeave` handlers with direct DOM style manipulation:
```typescript
onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = '#ecf0f1'; }}
onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = 'transparent'; }}
```
This is a React anti-pattern. It bypasses React's rendering model, creates unnecessary re-render overhead, and is harder to maintain than CSS.

**Suggestion:** Replace with a CSS `:hover` rule, either via a `<style>` block or a CSS module:
```css
.nav-link:hover { background-color: #ecf0f1; }
```

### IN-05: `console.log` in production registration handler

**File:** `web/pages/identity/register.tsx:17`
**Issue:** The `onSuccess` callback logs the created identity to the console:
```typescript
onSuccess={(identity) => { console.log('Identity created:', identity); }}
```

**Suggestion:** Remove or replace with a toast/notification for production. If the log is intentionally for debugging, wrap it in a `if (process.env.NODE_ENV !== 'production')` guard.

### IN-06: `alert()` for error and info display in memory page

**File:** `web/pages/memory.tsx:53,172`
**Issue:** Two locations use the native `alert()` dialog for user feedback — one for trace errors (line 53) and one for displaying memory document details on click (line 172):
```typescript
alert("Trace error: " + (err instanceof Error ? err.message : String(err)));
onClick={() => alert(JSON.stringify(p.doc, null, 2))}
```

**Suggestion:** Replace with in-page error states and a modal/drawer for document details. `alert()` blocks the main thread, provides a poor UX, and cannot be styled.

### IN-07: Form field names don't match API type

**File:** `web/components/IdentityForm.tsx:15-19`
**Issue:** The form manages `voice`, `constraints`, `mythicSignature`, `allowedBehaviors`, and `forbiddenBehaviors` — none of which correspond directly to fields in `IdentityCreateRequest`. They are manually concatenated into `customRules: string[]` on submit (lines 57-71). This creates a disconnect between the form UI and the API contract, making maintenance harder. If the API later adds native fields for these, the mapping logic needs updating in two places.

**Suggestion:** Either document this mapping clearly with a comment, or add a note in the `IdentityCreateRequest` type that certain semantic fields are encoded as `customRules`.

---

_Reviewed: 2026-06-07T12:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: standard_
