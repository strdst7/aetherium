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

**v1 Agent Architecture:**
- **LLM Engine:** Gemini (Google AI / Vertex AI)
- **Agent Framework:** Google Cloud Agent Builder
- **Tool Integration:** MCP server for MongoDB (schema discovery, CRUD, aggregation)
- **Task Model:** Multi-step decomposition → tool execution → reasoning → action
- **Identity Layer:** SigilIdentity registered and enforced through the pipeline

**Identity is the differentiator.** The "Aetherium moment" is when a developer registers an identity, runs the same prompt twice, and gets identical tone, worldview, and symbolic anchors — not just similar content. No other framework does this.

**Primary persona for v1:** The AI Systems Developer — works at a startup or research lab, wants consistent, controllable AI behavior, integrates via API.

**Design system exists:** `design/sigil/v1.json` contains design tokens. The visual language (crystalline geometry, ritualized interfaces) is part of the product identity.

**Key journey:** Register Identity → Generate Output → Verify Consistency.

**v1 Agent Journey:** User submits natural-language request → Agent decomposes into steps → Uses MongoDB MCP tool to query data → Gemini reasons over results → Agent takes action (report, update, trigger) → Output passes identity validation → Delivered to user with audit trail.

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

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-06 after initialization*
