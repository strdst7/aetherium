# Phase 03: Agent Interface & Contracts - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning
**Source:** ROADMAP + Codebase Analysis

<domain>
## Phase Boundary

Formalize and document the agent's natural-language API, ensuring structured responses are versioned and backward-compatible. Phase 3 builds on the functional endpoints from Phases 1-2 (POST /v1/reason with tool/task modes) and adds API contract stability, documentation, and versioning guarantees.

**What's in scope:**
- OpenAPI 3.0 specification for all agent endpoints
- Version negotiation (Accept-Version header, query param fallback)
- Structured error response standardization
- Response schema versioning with backward compatibility
- API documentation (Swagger UI)
- Health/status endpoints for agent observability
- Contract validation tests

**What's out of scope:**
- New reasoning capabilities (Phase 1-2 delivered those)
- Identity binding (Phase 4)
- Web UI redesign (Phase 9)
- Streaming responses (v2 / Phase 11)

</domain>

<decisions>
## Implementation Decisions

### API Versioning Strategy
- **D-31:** URL path versioning (`/v1/reason`, `/v2/reason`) as primary mechanism. Header-based (`Accept-Version: v1`) as optional override. Query param (`?api-version=v1`) as final fallback for simple clients.
- **D-32:** Version is embedded in `ReasonResponse.metadata.apiVersion` field. All v1 responses must include `apiVersion: "1.0.0"`.
- **D-33:** Breaking changes only allowed in major version bumps. Minor versions add optional fields. Patch versions fix bugs without schema changes.

### Error Response Standardization
- **D-34:** All API errors return RFC 7807 Problem Details format (`application/problem+json`). Required fields: `type`, `title`, `status`, `detail`. Optional: `instance` (request ID), `errors` (validation details array).
- **D-35:** Error codes are prefixed with phase domain: `AGENT_` for general, `REASON_` for reasoning endpoint, `TOOL_` for tool execution, `TASK_` for task mode.

### OpenAPI Specification
- **D-36:** OpenAPI 3.0.3 spec lives at `api/openapi.yml`. It is the single source of truth for API contracts. All TypeScript types must derive from or align with the spec.
- **D-37:** Spec is served at `/openapi.yml` (raw YAML) and `/docs` (Swagger UI) via `swagger-ui-express`.

### Response Contract Stability
- **D-38:** `ReasonResponse` fields added in Phase 2 (`plan`, `actions`, `planStatus`) are promoted from optional to required in the v1 contract. They were already populated by Phase 2 implementation.
- **D-39:** New fields must be optional and have `@since` annotation in OpenAPI spec. No removal of fields within a major version.
- **D-40:** `toolCalls`, `toolResults`, `toolExecutionTrace` remain optional (not all requests enable tools).

### OpenCode's Discretion
- Exact OpenAPI tooling (yaml vs json, bundler choice)
- Swagger UI theming and customization
- Health check granularity (simple vs detailed)
- API rate limiting approach (if any in v1)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing API Contracts
- `api/src/controllers/reason.ts` — ReasonRequest, ReasonResponse, TaskPlan, PlanStep, Action types
- `api/src/services/orchestrator.ts` — OrchestratorRequest, OrchestratorResponse, processWithTools
- `api/src/services/agent-builder.ts` — AgentBuilderResult, execute/executeTask return types
- `api/src/index.ts` — Express app setup, route registration, bootstrap

### Existing Web Interface
- `web/pages/index.tsx` — Natural language query UI calling POST /v1/reason
- `web/pages/agents.tsx` — Multi-agent orchestration UI
- `web/src/tokens.ts` — Design tokens

### Phase 1-2 Foundation
- `.planning/phases/01-agent-core-foundation/01-CONTEXT.md` — Provider setup, MCP integration
- `.planning/phases/02-agent-task-engine/02-CONTEXT.md` — Task mode, action types, plan generation
- `.planning/REQUIREMENTS.md` — AG-07, AG-08 requirements

</canonical_refs>

<specifics>
## Specific Ideas

- "I want developers to be able to generate a client SDK from our OpenAPI spec"
- "The API should return version info so callers know what schema to expect"
- "Errors should be machine-parseable, not just human-readable strings"
- "Backward compatibility means existing integrations (like the web UI) must work without changes"
- "Health endpoint should show MCP connection status, provider health, and memory service state"

</specifics>

<deferred>
## Deferred Ideas

- API rate limiting and throttling — can be added later via middleware
- API key authentication — v1 uses simple CORS; auth is future enhancement
- GraphQL interface — REST is sufficient for v1
- SDK generation automation — manual client creation for now

</deferred>

---

*Phase: 03-agent-interface-contracts*
*Context gathered: 2026-06-06*
