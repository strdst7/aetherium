# ROADMAP: Aetherium

**Granularity:** Fine (8-12 phases, 5-10 plans each)  
**Mode:** yolo (auto-approve)  
**Last updated:** 2026-06-06 (after 11-03 execution)

## Phases

- [ ] **Phase 1: Agent Core Foundation** — Gemini + Agent Builder + MongoDB MCP integration
- [ ] **Phase 2: Agent Task Engine** — Multi-step tasks, real-world action, and intelligent MongoDB assistance
- [ ] **Phase 3: Agent Interface & Contracts** — Natural-language API and structured response contracts
- [ ] **Phase 4: Identity Registration & Persistence** — SigilIdentity CRUD API with immutable version history
- [ ] **Phase 5: Identity-Bound Reasoning** — Orchestrator enforces identity constraints at every reasoning step
- [x] **Phase 6: Mythic Module** — Identity "soul" that shapes tone, voice, and symbolic context
- [x] **Phase 7: Sovereign Halo** — Output validation and enforcement layer with regeneration logic
- [x] **Phase 8: Audit & Immutability** — Complete append-only audit trail for every generation
- [ ] **Phase 9: Web UI Extensions** — Visual identity management, testing, and inspection pages
- [ ] **Phase 10: End-to-End Integration & Testing** — Full pipeline validation and backward compatibility
- [ ] **Phase 11: Performance Hardening & Documentation** — Latency validation, concurrency safety, and integrator docs

---

## Phase Details

### Phase 1: Agent Core Foundation
**Goal**: Agent can connect to Gemini, Google Cloud Agent Builder, and the MongoDB MCP server and execute basic tool calls  
**Depends on**: Nothing (first phase)  
**Requirements**: AG-01, AG-02, AG-03  
**Success Criteria** (what must be TRUE):
  1. Agent can initialize a Gemini reasoning session with tool-use enabled
  2. Agent can use Google Cloud Agent Builder framework to register and invoke tools
  3. Agent can connect to the MongoDB MCP server, discover schema, and execute a basic query
**Plans**: 4 plans in 3 waves

Plans:
- [ ] 01-01-PLAN.md — Gemini Provider Integration (AIProvider extension + GeminiProvider + bootstrap)
- [ ] 01-02-PLAN.md — MCP Client + AgentBuilder (stdio transport + tool management + lifecycle)
- [ ] 01-03-PLAN.md — Orchestrator Integration + API Contracts (tool loop + ReasonResponse extension + wiring)
- [ ] 01-04-PLAN.md — Test Infrastructure (MockAgentBuilder + MockMCPServer + unit + integration tests)

### Phase 2: Agent Task Engine
**Goal**: Agent can decompose user requests, execute multi-step tool workflows, and take real-world action via the MongoDB assistant  
**Depends on**: Phase 1  
**Requirements**: AG-04, AG-05, AG-06  
**Success Criteria** (what must be TRUE):
  1. Agent decomposes a natural-language request into a planned sequence of steps
  2. Agent executes tools, synthesizes results, and produces actionable output (reports, record updates, workflow triggers)
  3. Agent successfully solves the intelligent MongoDB assistant challenge end-to-end
**Plans**: 6 plans in 4 waves

Plans:
- [ ] 02-01-PLAN.md — Task Schema & Types (PlanStep, TaskPlan, Action, ActionType, PlanStatus + ReasonResponse/ReasonRequest extensions)
- [ ] 02-02-PLAN.md — Orchestrator Plan Generation (generatePlan method with validation and error handling)
- [ ] 02-03-PLAN.md — AgentBuilder Task Execution (executeTask with plan-then-execute, retry logic, action synthesis)
- [ ] 02-04-PLAN.md — Mock & Test Infrastructure (MockAgentBuilder.executeTask, MockMCPServer update tool, mock tests)
- [ ] 02-05-PLAN.md — Controller & API Integration (mode routing, auto-detection, POST /v1/reason task mode support)
- [ ] 02-06-PLAN.md — MongoDB Assistant Demo (seed-demo-data.ts, integration test for query + update pipeline)

### Phase 3: Agent Interface & Contracts
**Goal**: Agent exposes a stable natural-language API and returns structured, versioned responses  
**Depends on**: Phase 2  
**Requirements**: AG-07, AG-08  
**Success Criteria** (what must be TRUE):
  1. Developer can submit a natural-language request to a documented API endpoint
  2. Agent returns structured responses containing reasoning trace, tool calls made, and final action taken
  3. API contracts are versioned and backward-compatible with existing integrations
**Plans**: 4 plans in 3 waves

Plans:
- [ ] 03-01-PLAN.md — API Contract Specification (OpenAPI 3.0 spec + TypeScript type definitions)
- [ ] 03-02-PLAN.md — Versioning & Error Contract (version negotiation middleware + RFC 7807 error handler)
- [ ] 03-03-PLAN.md — API Documentation & Discovery (Swagger UI + health/status endpoints)
- [ ] 03-04-PLAN.md — Contract Validation & Testing (OpenAPI validation + backward compatibility tests)

### Phase 4: Identity Registration & Persistence
**Goal**: Developer can register, retrieve, list, and version SigilIdentities through a REST API  
**Depends on**: Phase 1 (MongoDB persistence layer)  
**Requirements**: ID-01, ID-02, ID-03, ID-04, ID-05, ID-06  
**Success Criteria** (what must be TRUE):
  1. Developer can register a SigilIdentity via `POST /identity/register` with all required fields
  2. System persists the identity in MongoDB with a unique `identity_id` and `sigil_hash`
  3. Developer can retrieve an identity by ID, list all identities, and update an existing identity via REST API
  4. Identity updates preserve immutable version history (previous versions remain accessible)
  5. Invalid identity definitions are rejected with clear validation errors
**Plans**: 4 plans in 4 waves

Plans:
- [ ] 04-01-PLAN.md — Identity Schema & Service (SigilIdentity types + IdentityService + MongoDB indexes + unit tests)
- [ ] 04-02-PLAN.md — Identity Registration & Retrieval API (POST /identity/register, GET /identity/{id}, GET /identity + validation + controller tests)
- [ ] 04-03-PLAN.md — Identity Update & Version History (PUT /identity/{id}, GET /identity/{id}/versions + immutable snapshot versioning + tests)
- [ ] 04-04-PLAN.md — API Contracts, OpenAPI & Integration (api-contracts.ts re-exports, openapi.yml schemas, index.ts bootstrap, integration tests)

### Phase 5: Identity-Bound Reasoning
**Goal**: Orchestrator loads and enforces the active identity at every reasoning step without cross-identity leakage  
**Depends on**: Phase 4  
**Requirements**: RE-01, RE-02, RE-03, RE-04, RE-05, RE-06  
**Success Criteria** (what must be TRUE):
  1. Orchestrator loads the active identity before executing any reasoning loop
  2. Identity constraints (allowed/forbidden behaviors) are applied at every reasoning step
  3. Multi-agent council outputs all align with the same active identity
  4. Memory retrieval returns only shards scoped to the active identity (no cross-identity leakage)
  5. Identity-bound reasoning produces a structured trace showing which identity rules were applied at each step
  6. Identity lookup and rule application adds no more than 200ms to total request latency
**Plans**: TBD

### Phase 6: Mythic Module
**Goal**: Identity has a programmable "soul" that shapes LLM prompts and rewrites outputs to match registered tone, voice, and symbolic anchors  
**Depends on**: Phase 5  
**Requirements**: MY-01, MY-02, MY-03, MY-04, MY-05  
**Success Criteria** (what must be TRUE):
  1. Mythic Module generates an identity schema (tone model, voice model, symbolic anchors, narrative constraints) from any SigilIdentity definition
  2. LLM prompts are automatically injected with identity-bound tone, voice, and symbolic context before generation
  3. `mythify(identity_id, raw_output)` rewrites raw LLM output to match the identity's registered tone and voice
  4. A default "neutral" identity is used when no identity is specified, preserving backward compatibility
  5. Symbolic anchors (sigils, archetypes, ratios) from `design/sigil/v1.json` are loaded and bound to generated schemas
**Plans**: 5 plans in 3 waves

Plans:
- [ ] 06-01-PLAN.md — Mythic Schema & Types (ToneModel, VoiceModel, SymbolicAnchor, DEFAULT_NEUTRAL_MYTHIC)
- [ ] 06-02-PLAN.md — Symbolic Anchor Loader (design/sigil/v1.json parser + constraint extraction)
- [ ] 06-03-PLAN.md — Mythic Module Service (schema generation, mythify, generateMythicPrompt, neutral fallback)
- [ ] 06-04-PLAN.md — Orchestrator Integration (mythic prompt injection, AgentBuilder + MultiAgentOrchestrator wiring)
- [ ] 06-05-PLAN.md — Bootstrap, OpenAPI & Integration Tests (DI registration, API spec updates, end-to-end pipeline test)

### Phase 7: Sovereign Halo
**Goal**: Every output is validated against identity law before delivery; failures trigger safe regeneration or structured error reporting  
**Depends on**: Phase 6  
**Requirements**: SH-01, SH-02, SH-03, SH-04, SH-05  
**Success Criteria** (what must be TRUE):
  1. Every generated output passes through Sovereign Halo validation before being returned to the caller
  2. Validation checks output against forbidden behaviors, tone deviation, and symbolic drift
  3. If validation fails, the output is rejected and a regeneration is triggered with tightened constraints
  4. After 3 failed regeneration attempts, a structured failure report is returned instead of an unvalidated output
  5. Every output includes a validation report (pass/fail status, rule checks, confidence score)
**Plans**: 6 plans in 4 waves

Plans:
- [ ] 07-01-PLAN.md — Halo Types & Validation Contracts (ValidationReport, ValidationCheck, FailureReport, HaloValidationOptions)
- [ ] 07-02-PLAN.md — Sovereign Halo Service Core (validation engine with forbidden behavior, tone deviation, symbolic drift checks)
- [ ] 07-03-PLAN.md — Orchestrator Integration & Regeneration (wrap generation with 3-attempt regeneration loop and failure reporting)
- [ ] 07-04-PLAN.md — API Contracts & Bootstrap Wiring (ReasonResponse with validationReport, OpenAPI schemas, Express bootstrap)
- [ ] 07-05-PLAN.md — Multi-Agent Council Validation (per-agent validation in MultiAgentOrchestrator with regeneration)
- [ ] 07-06-PLAN.md — Integration & Backward Compatibility (end-to-end tests, backward compat verification, AgentBuilder wiring)

### Phase 8: Audit & Immutability
**Goal**: Complete, append-only audit trail captures every identity-bound generation with full provenance  
**Depends on**: Phase 7  
**Requirements**: AUD-01, AUD-02, AUD-03, AUD-04  
**Success Criteria** (what must be TRUE):
  1. Every generated output is stored as an immutable AuditRecord in MongoDB at the time of generation
  2. AuditRecord contains all required fields: `identity_id`, `prompt`, `output`, `reasoning_trace`, `validation_report`, `timestamp`, `version`
  3. Developer can query audit records by `identity_id` and date range via `GET /audit?identity_id={id}&from={date}&to={date}`
  4. Audit records are append-only; no API endpoint permits updates or deletions
**Plans**: TBD

### Phase 9: Web UI Extensions
**Goal**: Developers can manage identities, test generations, inspect traces, and browse memory through the Next.js web shell  
**Depends on**: Phase 8  
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06  
**Success Criteria** (what must be TRUE):
  1. Web UI has an "Identity Registration" page where a developer can create a new SigilIdentity via a form
  2. Web UI has an "Identity Test" page where a developer can submit a prompt and see the identity-bound output
  3. Reasoning trace is displayed for each generation in an expandable, step-by-step format
  4. Validation report from Sovereign Halo (pass/fail, rule checks) is visible on each generation result
  5. Web UI has a "Memory Inspection" page showing memory shards filtered to the selected identity
  6. Active identity can be selected from a dropdown on all generation and inspection pages
**Plans**: 7 plans in 4 waves

Plans:
- [x] 09-01-PLAN.md — Shared UI Infrastructure & Design Tokens (types, API client, IdentitySelector, Layout)
- [x] 09-02-PLAN.md — Identity Registration Page (form + page for UI-01)
- [x] 09-03-PLAN.md — Reasoning Trace Component (expandable step-by-step display for UI-03)
- [x] 09-04-PLAN.md — Validation Report Display & API Contract (Sovereign Halo report UI + API update for UI-04)
- [x] 09-05-PLAN.md — Memory Inspection Page with Identity Filter (scoped memory shards for UI-05)
- [x] 09-06-PLAN.md — Identity Test Page (refactored reasoning shell using shared components for UI-02 + UI-06)
- [x] 09-07-PLAN.md — Integration, Navigation & Tests (global identity context, nav, Jest tests)

**Wave dependency notes:**
- **Wave 1** — 09-01 (no blockers)
- **Wave 2** *(blocked on Wave 1 completion)* — 09-02, 09-03, 09-04, 09-05
- **Wave 3** *(blocked on Wave 2 completion)* — 09-06
- **Wave 4** *(blocked on Wave 3 completion)* — 09-07

**Cross-cutting constraints:**
- Active identity must be selectable from a dropdown on all generation and inspection pages (UI-06)
- All pages must use the shared Layout component and design tokens

**UI hint**: yes

### Phase 10: End-to-End Integration & Testing
**Goal**: All components work together reliably through the complete identity-bound pipeline  
**Depends on**: Phase 9  
**Requirements**: (integration phase — validates all prior requirements)  
**Success Criteria** (what must be TRUE):
  1. Full pipeline integration test passes: register identity → submit prompt → receive identity-bound output → verify audit record exists
  2. Identity consistency test passes: the same prompt submitted twice returns outputs with identical tone, worldview, and symbolic anchors
  3. All existing API contracts from the brownfield codebase remain backward-compatible (additive changes only)
  4. End-to-end tests pass against both mocked LLM providers and real Gemini / Vertex AI instances
**Plans**: 5 plans in 3 waves

Plans:
- [x] 10-01-PLAN.md — Test Infrastructure & Fixtures (shared factories, mock provider, test database helper)
- [x] 10-02-PLAN.md — Full Pipeline Integration Test (register → generate → audit end-to-end)
- [x] 10-03-PLAN.md — Identity Consistency & Backward Compatibility (deterministic outputs, API compat, leakage tests)
- [x] 10-04-PLAN.md — Real Provider E2E Tests (Gemini/Vertex AI with skip guards)
- [x] 10-05-PLAN.md — Web E2E & Final Integration (health checks, web API tests, CI pipeline)

**Wave dependency notes:**
- **Wave 1** — 10-01, 10-02 (no blockers; infrastructure + full pipeline test)
- **Wave 2** *(blocked on Wave 1 completion)* — 10-03, 10-04 (needs fixtures and pipeline test infrastructure)
- **Wave 3** *(blocked on Wave 2 completion)* — 10-05 (needs all prior tests to validate CI pipeline)

**Cross-cutting constraints:**
- All integration tests must use test database helper (no production DB connections)
- Mock provider factory must never call real LLM APIs
- Real provider tests must skip gracefully when credentials are missing
- All tests must be independent (database reset between tests)

### Phase 11: Performance Hardening & Documentation
**Goal**: System meets performance constraints, handles concurrent load safely, and is fully documented for API integrators  
**Depends on**: Phase 10  
**Requirements**: (hardening phase — validates RE-06 performance constraint)  
**Success Criteria** (what must be TRUE):
   1. p99 latency for an identity-bound generation request is under 5 seconds total (including the ≤200ms identity overhead)
   2. System handles multiple concurrent identity-bound requests without cross-identity memory leakage or context contamination
   3. API documentation is complete with request/response examples for all public endpoints
   4. Deployment guide covers Docker Compose local setup and cloud deployment options with environment configuration
**Plans**: 5 plans in 3 waves

Plans:
- [x] 11-01-PLAN.md — Performance Benchmarking Infrastructure (benchmark utilities + performance fixtures)
- [x] 11-02-PLAN.md — Latency Validation Tests (p99 pipeline <5s + identity overhead ≤200ms)
- [x] 11-03-PLAN.md — Concurrency & Load Safety Tests (parallel requests + memory leakage under load)
- [x] 11-04-PLAN.md — API Documentation & Examples (OpenAPI examples + API integration guide)
- [ ] 11-05-PLAN.md — Deployment Guide & Final Verification (DEPLOYMENT.md + README + final checks)

**Wave dependency notes:**
- **Wave 1** — 11-01, 11-04 (no blockers; infrastructure + docs can proceed in parallel)
- **Wave 2** *(blocked on Wave 1 completion)* — 11-02, 11-03 (needs benchmark utilities from 11-01)
- **Wave 3** *(blocked on Wave 2 completion)* — 11-05 (needs test results and docs to finalize)

**Cross-cutting constraints:**
- All performance tests must use mock provider (no real API calls during benchmark)
- Documentation must use realistic example values matching schema types
- Deployment guide must not contain real secrets or credentials

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Agent Core Foundation | 4/4 | Complete | 2026-06-06 |
| 2. Agent Task Engine | 6/6 | Complete | 2026-06-06 |
| 3. Agent Interface & Contracts | 4/4 | Complete | 2026-06-06 |
| 4. Identity Registration & Persistence | 4/4 | Complete | 2026-06-06 |
| 5. Identity-Bound Reasoning | 6/6 | Complete | 2026-06-06 |
| 6. Mythic Module | 5/5 | Complete | 2026-06-06 |
| 7. Sovereign Halo | 6/6 | Complete | 2026-06-06 |
| 8. Audit & Immutability | 4/4 | Complete | 2026-06-06 |
| 9. Web UI Extensions | 7/7 | Complete | 2026-06-06 |
| 10. End-to-End Integration & Testing | 5/5 | Complete | 2026-06-06 |
| 11. Performance Hardening & Documentation | 4/5 | In Progress | 2026-06-06 |

---

## Coverage

**v1 requirements:** 40 total  
**Mapped to phases:** 40  
**Unmapped:** 0 ✓

| Category | Count | Phases |
|----------|-------|--------|
| Agent (AG) | 8 | 1, 2, 3 |
| Identity (ID) | 6 | 4 |
| Reasoning (RE) | 6 | 5 |
| Mythic Module (MY) | 5 | 6 |
| Sovereign Halo (SH) | 5 | 7 |
| Audit (AUD) | 4 | 8 |
| Web UI (UI) | 6 | 9 |

---
*Roadmap created: 2026-06-06*
