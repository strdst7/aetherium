# ROADMAP: Aetherium

**Granularity:** Fine (8-12 phases, 5-10 plans each)  
**Mode:** yolo (auto-approve)  
**Last updated:** 2026-06-06

## Phases

- [ ] **Phase 1: Agent Core Foundation** — Gemini + Agent Builder + MongoDB MCP integration
- [ ] **Phase 2: Agent Task Engine** — Multi-step tasks, real-world action, and intelligent MongoDB assistance
- [ ] **Phase 3: Agent Interface & Contracts** — Natural-language API and structured response contracts
- [ ] **Phase 4: Identity Registration & Persistence** — SigilIdentity CRUD API with immutable version history
- [ ] **Phase 5: Identity-Bound Reasoning** — Orchestrator enforces identity constraints at every reasoning step
- [ ] **Phase 6: Mythic Module** — Identity "soul" that shapes tone, voice, and symbolic context
- [ ] **Phase 7: Sovereign Halo** — Output validation and enforcement layer with regeneration logic
- [ ] **Phase 8: Audit & Immutability** — Complete append-only audit trail for every generation
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
**Plans**: TBD

### Phase 2: Agent Task Engine
**Goal**: Agent can decompose user requests, execute multi-step tool workflows, and take real-world action via the MongoDB assistant  
**Depends on**: Phase 1  
**Requirements**: AG-04, AG-05, AG-06  
**Success Criteria** (what must be TRUE):
  1. Agent decomposes a natural-language request into a planned sequence of steps
  2. Agent executes tools, synthesizes results, and produces actionable output (reports, record updates, workflow triggers)
  3. Agent successfully solves the intelligent MongoDB assistant challenge end-to-end
**Plans**: TBD

### Phase 3: Agent Interface & Contracts
**Goal**: Agent exposes a stable natural-language API and returns structured, versioned responses  
**Depends on**: Phase 2  
**Requirements**: AG-07, AG-08  
**Success Criteria** (what must be TRUE):
  1. Developer can submit a natural-language request to a documented API endpoint
  2. Agent returns structured responses containing reasoning trace, tool calls made, and final action taken
  3. API contracts are versioned and backward-compatible with existing integrations
**Plans**: TBD

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
**Plans**: TBD

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
**Plans**: TBD

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
**Plans**: TBD

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
**Plans**: TBD
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
**Plans**: TBD

### Phase 11: Performance Hardening & Documentation
**Goal**: System meets performance constraints, handles concurrent load safely, and is fully documented for API integrators  
**Depends on**: Phase 10  
**Requirements**: (hardening phase — validates RE-06 performance constraint)  
**Success Criteria** (what must be TRUE):
  1. p99 latency for an identity-bound generation request is under 5 seconds total (including the ≤200ms identity overhead)
  2. System handles multiple concurrent identity-bound requests without cross-identity memory leakage or context contamination
  3. API documentation is complete with request/response examples for all public endpoints
  4. Deployment guide covers Docker Compose local setup and cloud deployment options with environment configuration
**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Agent Core Foundation | 0/5 | Not started | - |
| 2. Agent Task Engine | 0/5 | Not started | - |
| 3. Agent Interface & Contracts | 0/4 | Not started | - |
| 4. Identity Registration & Persistence | 0/7 | Not started | - |
| 5. Identity-Bound Reasoning | 0/7 | Not started | - |
| 6. Mythic Module | 0/6 | Not started | - |
| 7. Sovereign Halo | 0/6 | Not started | - |
| 8. Audit & Immutability | 0/5 | Not started | - |
| 9. Web UI Extensions | 0/7 | Not started | - |
| 10. End-to-End Integration & Testing | 0/5 | Not started | - |
| 11. Performance Hardening & Documentation | 0/5 | Not started | - |

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
