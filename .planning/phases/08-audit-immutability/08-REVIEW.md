---
phase: 08-audit-immutability
reviewed: 2026-06-07T12:00:00.000Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - api/src/services/audit-service.ts
  - api/src/services/orchestrator.ts
  - api/src/types/audit.ts
  - api/src/types/api-contracts.ts
  - api/src/controllers/audit.ts
  - api/src/index.ts
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 08: Code Review Report — Audit & Immutability

**Reviewed:** 2026-06-07T12:00:00.000Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed 5 source files across the audit trail implementation (types, service, controller, orchestrator integration, and server bootstrap). The audit system implements append-only record storage with SHA-256 hashing, identity-scoped queries with pagination, and best-effort save semantics in the orchestrator. The architecture is sound, but several concrete defects were found: the model version is never actually tracked (undefined property access), the cryptographic hash leaves key provenance fields uncovered, UUIDs use non-crypto randomness, and the ISO date validator rejects valid ISO 8601 inputs.

## Critical Issues

### CR-01: `modelVersion` always resolves to `'unknown'` — `provider.model` does not exist on `AIProvider`

**File:** `api/src/services/orchestrator.ts:506`
**Issue:** The `saveAuditRecord` method accesses `provider.model` to populate `modelVersion` in the audit provenance. The `AIProvider` interface (defined in `api/src/adapters/ai-adapter.ts:34-46`) has no `model` property — it only has `name`, `capabilities`, `generate()`, `generateWithTools?()`, `embed?()`, and `healthCheck?()`. Since `provider.model` is always `undefined`, the fallback `'unknown'` is always used, making `modelVersion` useless for provenance tracking.

The model name is passed as part of the `GenerateRequest` (e.g., `model: 'gemini-1.5-pro'` on lines 230, 277, 341, 407, 450), but this value is never captured or exposed through the provider object itself.

**Impact:** Every audit record has `modelVersion: "unknown"`. The model identifier is a critical part of generation provenance — without it, you cannot determine which model produced a given output from the audit log alone.

**Fix:** Pass the model string explicitly into the audit record construction. Options:

**Option A — Pass `modelName` as a parameter to `saveAuditRecord`:**
```typescript
private async saveAuditRecord(
  req: OrchestratorRequest,
  response: OrchestratorResponse,
  identity: SigilIdentity | null,
  provider: AIProvider,
  modelName: string,
  startTime: number
): Promise<void> {
  // ...
  const provenance: AuditProvenance = {
    originalOutput: response.text,
    providerName: response.context.selectedProvider,
    modelVersion: modelName,  // from caller
    // ...
  };
```

**Option B — Add `defaultModel` to the `AIProvider` interface:**
```typescript
// In api/src/adapters/ai-adapter.ts
export interface AIProvider {
  name: string;
  defaultModel: string;  // add this
  // ...
}
```

**Option C — Use the `model` from the `GenerateRequest` that was actually used (requires refactoring).**

## Warnings

### WR-01: `originalOutput` stores the final processed output, not the raw LLM output

**File:** `api/src/services/orchestrator.ts:503`
**Issue:** The `AuditProvenance.originalOutput` field is documented as "The raw LLM output before any transformation" (`api/src/types/audit.ts:12`), but in both `process()` and `processWithTools()`, `response.text` is set to the FINAL output after mythification and Sovereign Halo validation/regeneration. As a result, `originalOutput` and `output` (both set to `response.text` on lines 503 and 522) are always identical, defeating the purpose of the separate field.

**Impact:** If mythification or regeneration transforms the output, the audit record cannot distinguish between the original LLM response and the post-processed output. This breaks the provenance chain — there is no record of what the model originally produced.

**Fix:** Capture the raw LLM output BEFORE any transformation. In `generateAndValidate()`, return the original candidate text alongside the final response text:

```typescript
// In generateAndValidate, capture pre-mythification output:
private async generateAndValidate(...): Promise<{
  responseText: string;
  originalOutput: string;  // add this
  validationReport?: ValidationReport;
  attempts: number;
}> {
  let candidate = await provider.generate({ ... });
  const rawOutput = candidate.text || '';  // capture before mythification
  let responseText = rawOutput;

  // Mythify if available
  if (identity && this.mythicModule && responseText) {
    const mythifyResult = await this.mythicModule.mythify(identity, responseText);
    if (mythifyResult.applied) {
      responseText = mythifyResult.output;
    }
  }
  // ... then return { responseText, originalOutput: rawOutput, ... }
```

Then thread `originalOutput` through to `saveAuditRecord`.

---

### WR-02: `Math.random()` used for UUID generation — not cryptographically secure

**File:** `api/src/services/audit-service.ts:166-171`
**Issue:** The custom `generateUUID()` method uses `Math.random()` as its entropy source. `Math.random()` is not cryptographically secure (it is a PRNG seeded with non-crypto entropy). For audit record identifiers that should be unique and tamper-evident, this is inappropriate. Node.js 20 provides `crypto.randomUUID()` which uses system-level CSPRNG.

**Impact:** In theory, UUID collisions are more likely with seeded PRNGs, and the IDs are predictable if an attacker can observe the sequence. While collision probability is still low, audit systems should use crypto-quality randomness.

**Fix:** Replace the custom implementation with the built-in Node.js 20 API:

```typescript
import { randomUUID } from "crypto";

private generateUUID(): string {
  return randomUUID();
}
```

Or alternatively, since `crypto` is already imported:

```typescript
private generateUUID(): string {
  return crypto.randomUUID();
}
```

---

### WR-03: `generateHash` does not cover `originalOutput` — key provenance field has no integrity protection

**File:** `api/src/services/audit-service.ts:134-137`
**Issue:** The `generateHash` function only hashes `identityId`, `identityVersion`, `prompt`, `output`, and `provenance.providerName`. It omits `provenance.originalOutput`, `provenance.modelVersion`, `provenance.regenerationAttempts`, and `provenance.mythifyTransformations`. This means an attacker can modify `originalOutput` (the supposed raw LLM output) without detection.

The integration test at `api/src/tests/services/audit-integration.test.ts:114-123` demonstrates tamper detection by modifying `output`, but does not test modifications to `originalOutput` — which would go undetected.

**Fix:** Include the full provenance fields in the hash:

```typescript
generateHash(record: AuditRecordCreate): string {
  const canonical = JSON.stringify({
    identityId: record.identityId,
    identityVersion: record.identityVersion,
    prompt: record.prompt,
    output: record.output,
    originalOutput: record.provenance.originalOutput,
    providerName: record.provenance.providerName,
    modelVersion: record.provenance.modelVersion,
    regenerationAttempts: record.provenance.regenerationAttempts,
    mythifyTransformations: record.provenance.mythifyTransformations,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
```

Using `JSON.stringify` also avoids delimiter-injection issues with the current `|`-delimited format (if a field contained `|`, the hash would be ambiguous).

---

### WR-04: `isValidISODate` rejects valid ISO 8601 timestamps without `.000` milliseconds

**File:** `api/src/controllers/audit.ts:125-128`
**Issue:** The validation function requires `date.toISOString() === dateString`, which means only the UTC+millisecond format (`YYYY-MM-DDTHH:mm:ss.sssZ`) is accepted. Valid ISO 8601 strings like `"2026-01-01T00:00:00Z"`, `"2026-01-01T00:00:00+00:00"`, and `"2026-01-01"` are all rejected despite being valid ISO 8601.

**Impact:** API consumers must know to include `.000` milliseconds in UTC. This is undocumented, unintuitive, and will cause confusing 400 errors for otherwise valid date inputs.

**Fix:** Relax the validation to accept any valid ISO 8601 date string:

```typescript
private isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.includes("T");
}
```

Alternatively, document the required format clearly in the error message and OpenAPI spec.

---

### WR-05: No verification endpoint for hash-based tamper detection

**File:** `api/src/controllers/audit.ts:136` (route definition)
**Issue:** The audit service generates SHA-256 hashes for tamper detection but provides no endpoint to verify them. A client receiving audit records has no way to programmatically check whether a record has been tampered with. The hash is returned alongside the record data, but there's no `GET /audit/:recordId/verify` or `POST /audit/verify` that re-computes the hash and compares.

**Impact:** The hash mechanism has limited practical value without a verification endpoint. Clients must re-implement the hashing logic and cannot trust the hash value stored in the record (since an attacker who modified the record could also update the hash).

**Fix:** Add a verify endpoint:

```typescript
// In audit controller
async verifyRecord(req: Request, res: Response): Promise<void> {
  try {
    const recordId = req.params.recordId;
    const record = await this.auditService.getById(recordId);
    if (!record) {
      res.status(404).json({ ... });
      return;
    }
    const computedHash = this.auditService.generateHash({
      identityId: record.identityId,
      identityName: record.identityName,
      identityVersion: record.identityVersion,
      prompt: record.prompt,
      output: record.output,
      provenance: record.provenance,
    });
    const valid = computedHash === record.hash;
    res.json({ recordId, valid, storedHash: record.hash, computedHash });
  } catch (error) {
    res.status(500).json({ ... });
  }
}
```

This also requires a `getById()` method on `AuditService`, which could be added as a simple `findOne` query.

## Info

### IN-01: Hardcoded model name `"gemini-1.5-pro"` in 5 locations in orchestrator

**File:** `api/src/services/orchestrator.ts:230,277,341,407,450`
**Issue:** The model string `"gemini-1.5-pro"` is hardcoded in every `provider.generate()` and `provider.generateWithTools()` call. This couples the orchestrator to a specific model and makes model configuration impossible without code changes. Additionally, it means the model name available at the call site is never threaded through to the audit provenance.

**Suggestion:** Make the model configurable via a constructor parameter, environment variable, or per-request option (e.g., `OrchestratorRequest.maxTokens` already exists — add `model`). Even a default model constant at the top of the file would be better than five independent string literals.

---

### IN-02: Audit collection has no TTL or size cap — unbounded growth

**File:** `api/src/services/audit-service.ts:66`
**Issue:** The `audit_records` MongoDB collection has no TTL index, capped collection configuration, or retention policy. Every identity-bound generation creates an audit record that persists forever. For a system in production, this will grow without bound.

**Suggestion:** Add a TTL index on `timestamp` with a configurable retention period (e.g., 90 days) or implement a capped collection with a maximum size. If indefinite retention is required, document the storage implications and consider archival strategies.

---

### IN-03: `any` typing for MongoDB filter bypasses compile-time safety

**File:** `api/src/services/audit-service.ts:90`
**Issue:** The MongoDB filter object is typed as `any`:

```typescript
const filter: any = { identityId: query.identityId };
```

This bypasses TypeScript's type checking. If `query.identityId` were `undefined` (despite being required in the type), the filter would silently match documents with `identityId: undefined` instead of throwing a type error at compile time.

**Suggestion:** Use a properly typed `Filter<Document>` from the `mongodb` driver:

```typescript
import { Filter, Document } from "mongodb";
// ...
const filter: Filter<Document> = { identityId: query.identityId };
```

---

### IN-04: `saveAuditRecord` outer try/catch has misleading error message

**File:** `api/src/services/orchestrator.ts:531-535`
**Issue:** The catch block logs `"[Orchestrator] Failed to save audit record:"`, but the code before the `save()` call (provenance construction on lines 503-514) is also inside the same try block. If `response.context.relevantMemories` is somehow undefined or `response.validationReport` has an unexpected shape, the error message would be misleading. This is not currently a bug (the catch does handle real errors), but the message scope is too narrow.

**Suggestion:** Use a more generic message or split the construction from the save:

```typescript
try {
  const provenance = this.buildProvenance(response, provider, startTime); // can throw
  const auditRecord = this.buildAuditRecord(req, response, identity, provenance);
  await this.auditService.save(auditRecord);
} catch (error) {
  console.warn('[Orchestrator] Failed to create or save audit record:', error);
}
```

---

_Reviewed: 2026-06-07T12:00:00.000Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: standard_
