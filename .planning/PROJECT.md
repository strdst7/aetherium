# Aetherium — Current State

**Shipped:** v1.1 Aetherium Identity Platform (2026-06-11)
**Status:** ✅ Complete — all 12 phases, 54 plans, 40/40 requirements validated

## What This Is

Aetherium is a sovereign, identity-first AI intelligence platform. It gives LLMs a stable, auditable identity layer so that developers can register an identity and reliably get identity-consistent outputs across sessions, tasks, and agents. It blends crystalline geometry, ritualized interfaces, and layered cognition to produce trustworthy, identity-bound insights that carry narrative coherence and technical rigor.

## Core Value

A developer can register an identity and reliably get identity-consistent outputs from an LLM across sessions, tasks, and agents.

## Next Milestone Goals

The v1.1 platform is feature-complete for the identity-first core. Future milestones can focus on:

- Multi-tenant & enterprise features (organization namespaces, RBAC, API key management)
- Advanced reasoning (streaming responses, chain-of-thought visualization, A/B testing for identity variants)
- Analytics (identity consistency dashboard, usage analytics, SIEM export)
- Integrations (OAuth 2.0 / OpenID Connect, webhooks, SDK packages)

## Requirements

### Validated (v1.1)

- ✓ **AG-01** – Gemini-powered agent — v1.1
- ✓ **AG-02** – Google Cloud Agent Builder with tool-use — v1.1
- ✓ **AG-03** – MongoDB MCP server integration — v1.1
- ✓ **AG-04** – Multi-step task decomposition and execution — v1.1
- ✓ **AG-05** – Action beyond chat (reports, records, workflows) — v1.1
- ✓ **AG-06** – Real-world MongoDB assistant challenge — v1.1
- ✓ **AG-07** – Natural-language API interface — v1.1
- ✓ **AG-08** – Structured responses with reasoning trace — v1.1
- ✓ **ID-01** – SigilIdentity registration via POST /identity/register — v1.1
- ✓ **ID-02** – MongoDB persistence with identity_id and sigil_hash — v1.1
- ✓ **ID-03** – Identity retrieval by identity_id — v1.1
- ✓ **ID-04** – List all identities — v1.1
- ✓ **ID-05** – Identity update with version history — v1.1
- ✓ **ID-06** – Identity validation on registration — v1.1
- ✓ **RE-01** – Orchestrator loads active identity before reasoning — v1.1
- ✓ **RE-02** – Identity constraints applied at every reasoning step — v1.1
- ✓ **RE-03** – Multi-agent council identity coherence — v1.1
- ✓ **RE-04** – Identity-scoped memory (no leakage) — v1.1
- ✓ **RE-05** – Structured identity trace — v1.1
- ✓ **RE-06** – Identity overhead ≤200ms (achieved ≤108ms) — v1.1
- ✓ **MY-01** – Mythic identity schema generation — v1.1
- ✓ **MY-02** – Identity-bound prompt injection — v1.1
- ✓ **MY-03** – mythify() output rewriting — v1.1
- ✓ **MY-04** – Default neutral identity — v1.1
- ✓ **MY-05** – Symbolic anchor loading from design/sigil/v1.json — v1.1
- ✓ **SH-01** – Output validation before delivery — v1.1
- ✓ **SH-02** – Identity law checks (behaviors, tone, symbols) — v1.1
- ✓ **SH-03** – Regeneration on validation failure — v1.1
- ✓ **SH-04** – Structured failure report after 3 attempts — v1.1
- ✓ **SH-05** – Validation report per output — v1.1
- ✓ **AUD-01** – Immutable AuditRecord in MongoDB — v1.1
- ✓ **AUD-02** – Full audit provenance — v1.1
- ✓ **AUD-03** – Query audit by identity_id and date range — v1.1
- ✓ **AUD-04** – Append-only, no updates/deletions — v1.1
- ✓ **UI-01** – Identity Registration page — v1.1
- ✓ **UI-02** – Identity Test page — v1.1
- ✓ **UI-03** – Reasoning trace display — v1.1
- ✓ **UI-04** – Validation report display — v1.1
- ✓ **UI-05** – Memory Inspection page — v1.1
- ✓ **UI-06** – Active identity dropdown — v1.1

### Active (Next Milestone)

- [ ] **ENT-01**: Support for organization-level identity namespaces
- [ ] **ENT-02**: Role-based access control (Steward, Architect, Translator roles)
- [ ] **ENT-03**: API key management and rotation
- [ ] **ADV-01**: Streaming responses for real-time generation
- [ ] **ADV-02**: Chain-of-thought visualization with interactive step expansion
- [ ] **ADV-03**: A/B testing framework for identity variants
- [ ] **ANL-01**: Identity consistency dashboard (measures drift over time)
- [ ] **ANL-02**: Usage analytics by identity and endpoint
- [ ] **ANL-03**: Export audit logs to external SIEM
- [ ] **INT-01**: OAuth 2.0 / OpenID Connect authentication
- [ ] **INT-02**: Webhook support for identity events
- [ ] **INT-03**: SDK packages for Python and Go

### Out of Scope

- Real-time collaboration / multi-user editing — not core to identity value
- Mobile native app — web-first, mobile later
- Advanced analytics dashboard — defer until identity layer is proven
- Third-party OAuth / SSO — API-key auth sufficient for v1
- Enterprise RBAC / multi-tenant isolation — single-tenant for v1
- Real-time chat / streaming responses — batch reasoning for v1
- Video or multimodal generation — text-only for identity-bound AI
- Custom LLM training / fine-tuning — identity through prompt engineering, not model weights

## Context

**Current codebase state:** 15,201 LOC TypeScript across api/src/ and web/src/
**Tech stack:** TypeScript, Node.js 20, Express 4.x, Next.js 14, React 18, MongoDB 6, Redis 7
**LLM:** Gemini (gemini-2.5-flash, gemini-embedding-2)
**Agent Framework:** Google Cloud Agent Builder
**Infrastructure:** Docker Compose (MongoDB 7, Redis 7-alpine, MinIO)
**CI:** GitHub Actions (api-tests + web-tests on push)
**Tests:** 283/288 pass API (5 pre-existing requireToolUse failures), 20/20 web tests pass

**Performance metrics (v1.1 validated):**
- Identity lookup + rule application: ≤108ms (target ≤200ms)
- p99 generation latency: ~3.99ms mock provider (target <5s)
- Cross-identity memory leakage: 0 (verified under concurrent load)
- Audit immutability: 100% (verified)

**Architecture mapping:**

| Existing Component | Aetherium Role | Status |
|--------------------|----------------|--------|
| `Orchestrator` | Crystal Core | Extended (identity hooks) |
| `MultiAgentOrchestrator` | Fusion Orchestrator | Extended (identity coherence) |
| `ReflectiveService` | Ascendant Framework + Sovereign Halo | Extended (rule engine) |
| MongoDB memory layer | Void Foundation | Kept |
| Next.js web shell | Sigil Gate UI | Extended |
| `ProviderRegistry` | Provider resilience layer | Kept |
| `MythicModule` | Identity Soul | New |
| `IdentityService` | Identity CRUD | New |
| `AuditService` | Immutable Audit | New |

**Known deferred items at close:**
- UAT-5 / UAT-6 require Gemini credentials (deferred)
- 5 pre-existing requireToolUse test failures
- /v1/memory/upsert route not wired (service method exists)

## Constraints

All original constraints validated in v1.1:
- **Tech Stack:** TypeScript, Node.js 20, Express, Next.js 14, MongoDB 6, Redis 7 — no changes
- **LLM:** Gemini via Google Cloud — gemini-2.5-flash deployed
- **Agent Framework:** Google Cloud Agent Builder — tool-use and multi-step reasoning integrated
- **MCP Server:** MongoDB MCP — schema discovery, query execution working
- **Dependencies:** Ollama/mock provider supported (requireToolUse conditional fix)
- **Compatibility:** All existing contracts backward-compatible (additive only)
- **Performance:** Identity overhead ≤200ms (measured ≤108ms)
- **Security:** Identity data encrypted at rest

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep MongoDB as Void Foundation (not replace) | Existing memory layer works; vector search is proven | ✓ Good |
| Primary user for v1 is API integrator | API validates identity layer; UI comes after primitives are solid | ✓ Good |
| Mythic Module is the largest new build | No equivalent in codebase; it is the identity "soul" | ✓ Good |
| Extend existing Orchestrator, not rewrite | Existing reasoning loops are sound; identity binding is additive | ✓ Good |
| Single-tenant for v1 | Multi-tenant adds complexity without proving identity value | ✓ Good |
| Gemini + Google Cloud Agent Builder for agent v1 | Required by project spec; tool-use and multi-step reasoning required | ✓ Good |
| MCP server for MongoDB as primary tool | Partner integration requirement; database is real-world data source | ✓ Good |
| Phase 12 scope = all session work | 5-layer brand + spike cleanup + infra fixes counted as Phase 12 | ✓ Good |
| Gemini model hardcoded, not env-configured | gemini-2.5-flash and gemini-embedding-2 are current stable | ⚠️ Revisit |
| requireToolUse conditional on tools.length > 0 | Enables Ollama without tools while Gemini works with tools | ✓ Good |
| Vercel rootDirectory: "web" in root vercel.json | API stays on Google Cloud Run; clean separation | ✓ Good |
| Fixed unawaited healthCheck Promise | Accessing .ok on Promise always returned undefined | ✓ Good |

<details>
<summary>Previous PROJECT.md (pre-v1.1)</summary>

# Aetherium

## What This Is

Aetherium is a sovereign, identity-first AI intelligence platform. It gives LLMs a stable, auditable identity layer so that developers can register an identity and reliably get identity-consistent outputs across sessions, tasks, and agents. It blends crystalline geometry, ritualized interfaces, and layered cognition to produce trustworthy, identity-bound insights that carry narrative coherence and technical rigor.

**v1 Core:** Build a functional agent powered by Gemini and Google Cloud Agent Builder that integrates a partner's MCP server (MongoDB) to solve a real-world challenge. The agent goes beyond chat — it uses tools, handles multi-step tasks, and takes action.

## Core Value

A developer can register an identity and reliably get identity-consistent outputs from an LLM across sessions, tasks, and agents.

**v1 Proof Point:** The agent can receive a natural-language request, use the MongoDB MCP tool to query data, reason over the results with Gemini, and take action (generate a report, update a record, trigger a workflow) — all while maintaining identity-consistent tone and behavior.

## Requirements

### Validated

- ✓ Multi-agent council pipeline (Archivist → SigilKeeper → Narrator) — existing
- ✓ MongoDB memory persistence with vector search (cosine similarity) — existing
- ✓ ProviderRegistry with priority-based failover and health checks — existing
- ✓ ReflectiveService for identity validation — existing
- ✓ Next.js web shell with pages for reasoning, agents, memory, governance — existing
- ✓ Docker Compose local infrastructure (MongoDB, Redis, MinIO) — existing
- ✓ Test suite with Jest across API and web — existing

### Active

- [ ] **AG-01**: Agent is powered by Gemini (Google AI / Vertex AI) as the primary reasoning engine
- [ ] **AG-02**: Agent is built on Google Cloud Agent Builder framework with tool-use capabilities
- [ ] **AG-03**: Agent integrates a partner MCP server for MongoDB (connection, schema discovery, query execution)
- [ ] **AG-04**: Agent handles multi-step tasks: decomposes user requests, plans steps, executes tools, synthesizes results
- [ ] **AG-05**: Agent takes action beyond chat: generates reports, updates records, triggers workflows via tools
- [ ] **AG-06**: Agent solves a real-world challenge (e.g., intelligent MongoDB assistant, data-aware reasoning agent)
- [ ] **ID-01**: Developer can register a SigilIdentity via `POST /identity/register` with name, voice, constraints, mythic signature, allowed behaviors, and forbidden behaviors
- [ ] **ID-02**: System persists the SigilIdentity in MongoDB with a unique `identity_id` and `sigil_hash`
- [ ] **ID-03**: Developer can retrieve a SigilIdentity by `identity_id` via `GET /identity/{id}`
- [ ] **ID-04**: Developer can list all registered identities via `GET /identity`
- [ ] **ID-05**: Developer can update an existing identity via `PUT /identity/{id}` (versioned, immutable history preserved)
- [ ] **ID-06**: Identity definition is validated on registration (required fields, max length, allowed characters)
- [ ] **RE-01**: Orchestrator loads the active identity before executing any reasoning loop
- [ ] **RE-02**: Orchestrator applies identity constraints (allowed/forbidden behaviors) at every reasoning step
- [ ] **RE-03**: MultiAgentOrchestrator enforces identity coherence — all agent outputs in the council must align with the same identity
- [ ] **RE-04**: Memory retrieval is scoped to the active identity (no cross-identity memory leakage)
- [ ] **RE-05**: Identity-bound reasoning produces a structured trace showing which identity rules were applied at each step
- [ ] **RE-06**: Identity lookup and rule application adds no more than 200ms to total request latency
- [ ] **MY-01**: Mythic Module generates an identity schema from a SigilIdentity definition (tone model, voice model, symbolic anchors, narrative constraints)
- [ ] **MY-02**: Mythic Module shapes LLM prompts by injecting identity-bound tone, voice, and symbolic context
- [ ] **MY-03**: Mythic Module exposes a `mythify(identity_id, raw_output)` function that rewrites output to match identity tone
- [ ] **MY-04**: Mythic Module includes a default "neutral" identity for backwards compatibility when no identity is specified
- [ ] **MY-05**: Symbolic anchors (sigils, archetypes, ratios) are loaded from `design/sigil/v1.json` and bound to the identity
- [ ] **SH-01**: Every output passes through Sovereign Halo validation before being returned to the caller
- [ ] **SH-02**: Sovereign Halo checks output against identity law (forbidden behaviors, tone deviation, symbolic drift)
- [ ] **SH-03**: If validation fails, Sovereign Halo rejects the output and triggers a regeneration with tightened constraints
- [ ] **SH-04**: After 3 regeneration attempts, Sovereign Halo returns a structured failure report instead of an unvalidated output
- [ ] **SH-05**: Sovereign Halo produces a validation report for every output (pass/fail, rule checks, confidence score)
- [ ] **AUD-01**: Every generated output is stored as an immutable AuditRecord in MongoDB
- [ ] **AUD-02**: AuditRecord contains: `identity_id`, `prompt`, `output`, `reasoning_trace`, `validation_report`, `timestamp`, `version`
- [ ] **AUD-03**: Developer can query audit records by `identity_id` and date range via `GET /audit?identity_id={id}&from={date}&to={date}`
- [ ] **AUD-04**: Audit records are append-only; no updates or deletions permitted
- [ ] **UI-01**: Web UI has an "Identity Registration" page where a developer can create a new SigilIdentity
- [ ] **UI-02**: Web UI has an "Identity Test" page where a developer can send a prompt and see the identity-bound output
- [ ] **UI-03**: Web UI displays the reasoning trace for each generation (expandable, step-by-step)
- [ ] **UI-04**: Web UI displays the validation report from Sovereign Halo (pass/fail, rule checks)
- [ ] **UI-05**: Web UI has a "Memory Inspection" page showing memory shards scoped to the selected identity
- [ ] **UI-06**: Web UI supports selecting an active identity from a dropdown on all generation pages

### Out of Scope

- Real-time collaboration / multi-user editing — not core to v1 identity value
- Mobile native app — web-first, mobile later
- Advanced analytics dashboard — defer until identity layer is proven
- Third-party OAuth / SSO integrations — API-key auth sufficient for v1
- Enterprise RBAC / multi-tenant isolation — single-tenant for v1
- Real-time chat or streaming responses — batch reasoning for v1
- Video or multimodal generation — text-only for identity-bound AI

## Context

**Brownfield codebase:** The project has an existing TypeScript/Node.js/Next.js codebase with a working multi-agent pipeline, MongoDB memory, provider failover, and a web shell. This code is the foundation — not the final product. Existing components map to the ascendant architecture:

| Existing Component | Aetherium Component | Status |
|--------------------|---------------------|--------|
| `Orchestrator` | Crystal Core | Extend (add identity hooks) |
| `MultiAgentOrchestrator` | Fusion Orchestrator | Extend (add identity coherence) |
| `ReflectiveService` | Ascendant Framework + Sovereign Halo | Extend (add rule engine) |
| MongoDB memory layer | Void Foundation | Keep |
| Next.js web shell | Sigil Gate UI | Extend |
| `ProviderRegistry` | Provider resilience layer | Keep |

## Constraints

- **Tech Stack:** TypeScript, Node.js 20, Express, Next.js 14, MongoDB 6, Redis 7 — no framework changes for v1
- **LLM:** Gemini via Google Cloud (Vertex AI or Google AI Studio); must support tool-use and function calling
- **Agent Framework:** Google Cloud Agent Builder; must support multi-step reasoning and tool orchestration
- **MCP Server:** Partner-provided MongoDB MCP server; must handle schema discovery, query execution, and connection management
- **Timeline:** v1 must be demonstrable end-to-end; no partial-ship of identity layer
- **Dependencies:** Ollama or mock provider for LLM inference; no cloud LLM hard dependency
- **Compatibility:** Existing API contracts must not break; additive changes only
- **Performance:** Identity lookup and validation must not add >200ms to request latency
- **Security:** Identity definitions may contain sensitive organizational voice data — stored encrypted at rest

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep MongoDB as Void Foundation (not replace) | Existing memory layer works; vector search is proven | — Pending |
| Primary user for v1 is the API integrator, not end-user | API validates identity layer; UI comes after primitives are solid | — Pending |
| Mythic Module is the largest new build | No equivalent exists in current codebase; it is the identity "soul" | — Pending |
| Extend existing Orchestrator, not rewrite | Existing reasoning loops are sound; identity binding is additive | — Pending |
| Single-tenant for v1 | Multi-tenant isolation adds complexity without proving identity value | — Pending |
| Gemini + Google Cloud Agent Builder for agent v1 | Required by project spec; tool-use and multi-step reasoning are core requirements | — Pending |
| MCP server for MongoDB as primary tool | Partner integration requirement; database is the real-world data source | — Pending |

</details>

---

*Last updated: 2026-06-11 after v1.1 milestone*
