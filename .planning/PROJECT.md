# Aetherium

## What This Is

Aetherium is a sovereign, identity-first AI intelligence platform. It gives LLMs a stable, auditable identity layer so that developers can register an identity and reliably get identity-consistent outputs across sessions, tasks, and agents. It blends crystalline geometry, ritualized interfaces, and layered cognition to produce trustworthy, identity-bound insights that carry narrative coherence and technical rigor.

## Core Value

A developer can register an identity and reliably get identity-consistent outputs from an LLM across sessions, tasks, and agents.

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

- [ ] **ID-01**: Developer can register a SigilIdentity via API (name, voice, constraints, mythic signature, allowed/forbidden behaviors)
- [ ] **ID-02**: SigilIdentity is persisted in MongoDB and retrievable by `identity_id`
- [ ] **RE-01**: Orchestrator (Crystal Core) loads identity before reasoning and applies identity rules at every step
- [ ] **RE-02**: MultiAgentOrchestrator (Fusion Orchestrator) enforces identity coherence across agent outputs
- [ ] **MY-01**: Mythic Module generates identity schema (tone model, voice model, symbolic anchors, narrative constraints)
- [ ] **MY-02**: Mythic Module shapes LLM prompts with identity-bound tone and symbolic context
- [ ] **SH-01**: Sovereign Halo performs final-pass identity validation on every output before release
- [ ] **SH-02**: Sovereign Halo rejects or regenerates outputs that violate identity law
- [ ] **UI-01**: Web UI supports identity registration, identity testing, reasoning trace viewing, and memory inspection
- [ ] **AUD-01**: Every output is stored with an immutable AuditRecord containing identity_id, trace, and validation report

### Out of Scope

- Real-time collaboration / multi-user editing — not core to v1 identity value
- Mobile native app — web-first, mobile later
- Advanced analytics dashboard — defer until identity layer is proven
- Third-party OAuth / SSO integrations — API-key auth sufficient for v1
- Enterprise RBAC / multi-tenant isolation — single-tenant for v1
- Real-time chat or streaming responses — batch reasoning for v1

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

**Identity is the differentiator.** The "Aetherium moment" is when a developer registers an identity, runs the same prompt twice, and gets identical tone, worldview, and symbolic anchors — not just similar content. No other framework does this.

**Primary persona for v1:** The AI Systems Developer — works at a startup or research lab, wants consistent, controllable AI behavior, integrates via API.

**Design system exists:** `design/sigil/v1.json` contains design tokens. The visual language (crystalline geometry, ritualized interfaces) is part of the product identity.

**Key journey:** Register Identity → Generate Output → Verify Consistency.

## Constraints

- **Tech Stack:** TypeScript, Node.js 20, Express, Next.js 14, MongoDB 6, Redis 7 — no framework changes for v1
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
