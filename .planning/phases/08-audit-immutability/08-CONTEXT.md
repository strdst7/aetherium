# Phase 8: Audit & Immutability — Context

**Gathered:** 2026-06-06
**Status:** Ready for planning
**Source:** Planner derivation from ROADMAP.md + codebase analysis

<domain>
## Phase Boundary

Phase 8 delivers the Audit & Immutability layer — a complete, append-only audit trail that captures every identity-bound generation with full provenance. This phase depends on Phase 7 (Sovereign Halo) because validation reports must be captured in audit records.

The audit system must:
- Store every generated output as an immutable AuditRecord in MongoDB
- Capture identity_id, prompt, output, reasoning_trace, validation_report, timestamp, version
- Provide query endpoints (GET /audit?identity_id={id}&from={date}&to={date})
- Enforce append-only semantics (no updates or deletions)

## Key Constraints

- All changes are additive (backward compatibility with Phase 1-7 APIs)
- Audit records must be immutable (no updates/deletions)
- MongoDB is the persistence layer (consistent with existing infrastructure)
- Audit capture must not block the generation pipeline (async logging preferred)
- Query endpoints must be efficient (MongoDB indexes on identity_id and timestamp)
- Audit data must be queryable by identity and date range
</domain>

<decisions>
## Implementation Decisions

### Type System
- **D-01**: AuditRecord types live in `api/src/types/audit.ts`, separate from halo/identity types
- **D-02**: AuditRecord includes a `recordId` field (UUID v4) for unique identification
- **D-03**: AuditRecord.version uses the identity version (not a separate audit version)

### Audit Service
- **D-04**: AuditService is a standalone service (not mixed into Orchestrator)
- **D-05**: Audit capture is synchronous (not async) to ensure data durability before response
- **D-06**: AuditService uses a dedicated MongoDB collection: `audit_records`
- **D-07**: Audit records include the full prompt (not truncated) for provenance

### Immutability
- **D-08**: No update/delete endpoints in the API
- **D-09**: AuditRecord interface has no `updatedAt` field (only `createdAt`)
- **D-10**: Database-level: no unique indexes that would allow updates (append-only insert)

### Integration
- **D-11**: Orchestrator calls AuditService.save() after generation (before returning response)
- **D-12**: AuditService.save() receives OrchestratorResponse + identity for full provenance
- **D-13**: If audit save fails, the generation still succeeds (audit is best-effort, not blocking)

### Query API
- **D-14**: GET /audit endpoint with query params (identity_id, from, to, limit, offset)
- **D-15**: Default limit: 50 records, max limit: 500
- **D-16**: Response includes total count and pagination info
</decisions>

<canonical_refs>
## Canonical References

### Audit System
- `api/src/types/halo.ts` — ValidationReport, ValidationCheck types (for audit capture)
- `api/src/services/orchestrator.ts` — OrchestratorResponse (source of audit data)
- `api/src/types/identity.ts` — SigilIdentity (for identity context)

### Database
- `api/src/services/memory-service.ts` — MongoDB connection patterns
- `api/src/services/identity-service.ts` — MongoDB collection patterns

### API Contracts
- `api/src/controllers/reason.ts` — ReasonResponse (includes validationReport)
- `api/src/openapi.yml` — OpenAPI specification (to extend with audit endpoints)

### Existing Patterns
- `api/src/services/identity-service.ts` — CRUD service patterns with MongoDB
- `api/src/controllers/identity.ts` — Controller patterns with validation
</canonical_refs>

<specifics>
## Specific Ideas

- AuditRecord should include a `provenance` field with chain of transformations:
  - original LLM output
  - mythify transformations
  - validation results
  - regeneration attempts
- Include memory shards used in generation (for reproducibility)
- Include provider name and model version
- Timestamp should be ISO 8601 with millisecond precision
- Consider a `hash` field for tamper detection (SHA-256 of key fields)
- Query endpoint should support sorting (newest first default)
</specifics>

<deferred>
## Deferred Ideas

- Real-time audit streaming (WebSocket/SSE) — future enhancement
- Audit log compaction/archival — future enhancement
- Multi-region audit replication — future enhancement
- Audit analytics dashboard — future enhancement
- Cryptographic signing of audit records — future enhancement
</deferred>

---

*Phase: 08-audit-immutability*
*Context gathered: 2026-06-06 via planner derivation*
