# Phase 4: Identity Registration & Persistence - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning
**Source:** ROADMAP.md + REQUIREMENTS.md (no prior discuss-phase)

<domain>
## Phase Boundary

This phase delivers the SigilIdentity CRUD API with immutable version history. It is the foundation for all subsequent identity-bound features (reasoning, mythic module, sovereign halo, audit). Without this phase, no identity can be registered, retrieved, or versioned.

**Scope in:**
- SigilIdentity data model and TypeScript types
- MongoDB persistence with unique `identity_id` and `sigil_hash`
- REST endpoints: POST /identity/register, GET /identity/{id}, GET /identity, PUT /identity/{id}
- Immutable version history (previous versions remain accessible)
- Input validation on registration
- Service tests and controller tests

**Scope out:**
- Web UI for identity management (Phase 9)
- Identity-bound reasoning enforcement (Phase 5)
- Mythic module generation (Phase 6)
- Sovereign Halo validation (Phase 7)
- Audit trail for generations (Phase 8)
- Multi-tenant identity namespaces (v2)

</domain>

<decisions>
## Implementation Decisions

### MongoDB Collection Strategy (D-01)
- **Decision:** Use a single `identities` collection with embedded `versions` array for version history.
- **Rationale:** MongoDB's document model handles nested arrays well. For v1 scale (single-tenant, hundreds of identities), embedding versions avoids join complexity. If versions grow unbounded, a future migration can split to a separate `identity_versions` collection.
- **Locked:** Yes

### sigil_hash Generation (D-02)
- **Decision:** `sigil_hash` is a deterministic SHA-256 hash of canonicalized identity fields (name, voice, constraints, allowed_behaviors, forbidden_behaviors, mythic_signature), sorted alphabetically by key.
- **Rationale:** Enables quick identity comparison and deduplication. Hash changes on any material field change, triggering a new version.
- **Locked:** Yes

### identity_id Format (D-03)
- **Decision:** `identity_id` is a URL-safe base64-encoded 16-byte random value, prefixed with `id_` (e.g., `id_aB3x9KpLmQ`).
- **Rationale:** Human-readable prefix aids debugging. 16 bytes = 128 bits = collision-resistant for v1 scale. URL-safe base64 avoids encoding issues in REST paths.
- **Locked:** Yes

### Validation Rules (D-04)
- **Decision:** Registration validates:
  - `name`: required, string, 1-128 chars, alphanumeric + spaces + hyphens
  - `voice`: required, string, 1-256 chars
  - `constraints`: optional, array of strings, max 50 items, each 1-512 chars
  - `mythic_signature`: optional, string, max 1024 chars
  - `allowed_behaviors`: optional, array of strings, max 100 items, each 1-256 chars
  - `forbidden_behaviors`: optional, array of strings, max 100 items, each 1-256 chars
- **Rationale:** Prevents abuse while allowing expressive identity definitions. Length limits prevent DB bloat.
- **Locked:** Yes

### Version History Model (D-05)
- **Decision:** On PUT /identity/{id}, the current identity document is appended to a `versions` array with `version_number` (auto-incrementing integer starting at 1), `updated_at`, and `sigil_hash`. The main document is updated with new fields, incremented `version_number`, and new `sigil_hash`.
- **Rationale:** Simple, atomic within one document. GET /identity/{id}/versions returns the embedded array. Previous versions are never mutated or removed.
- **Locked:** Yes

### Error Response Format (D-06)
- **Decision:** All identity endpoints return RFC 7807 Problem Details (consistent with existing AetheriumError pattern). Identity not found = 404 with `IDENTITY_NOT_FOUND` code. Validation failures = 400 with field-level `errors` array.
- **Rationale:** Consistency with Phase 3 error contract.
- **Locked:** Yes

### OpenCode's Discretion
- **Implementation details:** Service class structure, exact MongoDB index configuration, test fixture data.
- **Technical choices:** Native MongoDB driver (consistent with MemoryService), Express router pattern (consistent with existing controllers).
- **Test strategy:** Co-located tests (consistent with project convention), supertest for controller tests.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Patterns
- `api/src/services/memory-service.ts` — MongoDB service pattern (connect, collection, indexes, CRUD)
- `api/src/controllers/reason.ts` — Controller pattern (validation, error handling, response shaping)
- `api/src/middleware/error-handler.ts` — AetheriumError pattern, ErrorCode enum
- `api/src/types/api-contracts.ts` — Type definition patterns
- `api/openapi.yml` — OpenAPI schema patterns
- `api/src/index.ts` — Bootstrap and route registration pattern
- `api/jest.config.js` — Test configuration

### Design System
- `design/sigil/v1.json` — Symbolic anchors and compliance rules (referenced by MY-05 in Phase 6, not directly used here)

</canonical_refs>

<specifics>
## Specific Ideas

### SigilIdentity Fields (from ID-01)
```json
{
  "identity_id": "id_aB3x9KpLmQ",
  "name": "Archivist Prime",
  "voice": "formal, precise, archival",
  "constraints": ["must cite sources", "no speculation beyond 2050"],
  "mythic_signature": "Keeper of the crystalline record",
  "allowed_behaviors": ["query_databases", "generate_reports", "summarize_documents"],
  "forbidden_behaviors": ["modify_records", "access_external_apis", "generate_code"],
  "sigil_hash": "sha256:abc123...",
  "version": 3,
  "created_at": "2026-06-06T12:00:00Z",
  "updated_at": "2026-06-06T14:30:00Z",
  "versions": [
    {
      "version_number": 1,
      "sigil_hash": "sha256:old1...",
      "updated_at": "2026-06-06T12:00:00Z",
      "snapshot": { /* full identity state at v1 */ }
    },
    {
      "version_number": 2,
      "sigil_hash": "sha256:old2...",
      "updated_at": "2026-06-06T13:00:00Z",
      "snapshot": { /* full identity state at v2 */ }
    }
  ]
}
```

### Endpoint Summary
| Method | Path | Description |
|--------|------|-------------|
| POST | /identity/register | Create new identity |
| GET | /identity/{id} | Retrieve identity by ID |
| GET | /identity | List all identities |
| PUT | /identity/{id} | Update identity (creates version) |
| GET | /identity/{id}/versions | List version history |

</specifics>

<deferred>
## Deferred Ideas

- **Soft delete / archive endpoint** — Not required for v1; can be added in v2
- **Identity search / filtering** — Not in v1 requirements
- **Bulk identity import** — Not in v1 requirements
- **Identity template / clone** — Nice-to-have for v2

</deferred>

---

*Phase: 04-identity-registration*
*Context gathered: 2026-06-06*
