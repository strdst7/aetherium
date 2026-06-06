# Phase 6: Mythic Module — Context

**Gathered:** 2026-06-06
**Status:** Ready for planning
**Source:** Planner derivation from ROADMAP.md + codebase analysis

<domain>
## Phase Boundary

Phase 6 delivers the Mythic Module — an identity "soul" that shapes LLM prompts and rewrites outputs to match registered tone, voice, and symbolic anchors. This is the largest new build in Aetherium v1; no equivalent exists in the current codebase.

The Mythic Module operates between Identity-Bound Reasoning (Phase 5) and Sovereign Halo (Phase 7). It receives resolved SigilIdentities from the IdentityBindingService and transforms both the inputs (prompts) and outputs (responses) of the LLM generation pipeline.

## Key Constraints

- All changes are additive (backward compatibility with Phase 1-5 APIs must be preserved)
- Default "neutral" identity must be used when no identity is specified
- Symbolic anchors must be loaded from `design/sigil/v1.json` (existing design system)
- Identity lookup and mythic generation must not exceed the existing ≤200ms overhead budget
</domain>

<decisions>
## Implementation Decisions

### Type System
- **D-01**: Mythic types live in `api/src/types/mythic.ts`, separate from identity types to maintain modularity
- **D-02**: `SigilIdentity.config` gets an optional `mythic?: MythicIdentity` field (not a top-level field) to preserve backward compatibility
- **D-03**: `DEFAULT_NEUTRAL_MYTHIC` is a static constant, not a database record, for zero-latency fallback

### Symbolic Anchors
- **D-04**: `SymbolicAnchorLoader` reads `design/sigil/v1.json` at runtime and transforms tokens into `SymbolicAnchor[]`
- **D-05**: Anchor weights are derived from the design system (compliance_rules have explicit weights; other tokens use category defaults)
- **D-06**: If `v1.json` is missing or malformed, the loader returns empty arrays (graceful degradation)

### MythicModuleService
- **D-07**: `generateMythicIdentity()` resolves the identity first, then checks for cached `config.mythic`, then generates a new schema
- **D-08**: `mythify()` applies rule-based text transformation (not a second LLM call) to stay within latency budget
- **D-09**: `generateMythicPrompt()` builds a system prompt extension that is prepended to the base prompt before LLM generation
- **D-10**: Sigil hash is SHA-256 of identityId + sorted anchors JSON, truncated to 16 hex chars

### Integration
- **D-11**: Orchestrator receives `MythicModuleService` as an optional 4th constructor parameter
- **D-12**: If `mythicModule` is undefined, Orchestrator behavior is identical to Phase 5 (full backward compatibility)
- **D-13**: AgentBuilder propagates mythic context through both standard and tool-enabled reasoning paths
- **D-14**: `ReasonResponse` gets an optional `mythicMetadata` field (omitted when neutral identity is active)

### Default Identity
- **D-15**: `IdentityBindingService.resolve()` returns a synthetic neutral `SigilIdentity` for "neutral", empty, or whitespace anchors
- **D-16**: The synthetic neutral identity has no custom rules, default temperature 0.7, and provider "gemini"
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Identity System
- `api/src/types/identity.ts` — SigilIdentity, IdentityConfig types
- `api/src/services/identity-binding.ts` — IdentityBindingService (resolve, resolveOrThrow)
- `api/src/services/identity-constraints.ts` — IdentityConstraintEngine (evaluate rules)

### Orchestrator & Agent
- `api/src/services/orchestrator.ts` — process(), processWithTools(), OrchestratorContext
- `api/src/services/agent-builder.ts` — AgentBuilder, AgentBuilderResult
- `api/src/services/multi-agent-orchestrator.ts` — Multi-agent council orchestration

### Design System
- `design/sigil/v1.json` — Source of truth for symbolic anchors

### API Contracts
- `api/src/controllers/reason.ts` — ReasonRequest, ReasonResponse, TaskPlan
- `api/src/openapi.yml` — OpenAPI 3.0 specification
</canonical_refs>

<specifics>
## Specific Ideas

- The tone model vocabulary level "arcane" should trigger replacement of common words with elevated synonyms (maintain a small built-in map)
- Ceremonial formality should prepend ritualistic openings when missing
- First-person voice perspective should convert "It is" → "I am" and similar constructions
- Symbolic anchors like "golden" ratio should inject references to "golden proportion" in outputs where relevant
- Narrative constraints with scope "opening" must ensure output begins with appropriate framing
</specifics>

<deferred>
## Deferred Ideas

- LLM-based mythify (using a second LLM call for more sophisticated rewriting) — deferred to Phase 7+ due to latency budget
- Dynamic anchor weight learning (adjusting weights based on user feedback) — future enhancement
- Mythic identity versioning (separate version history for mythic schemas) — not needed for v1
- Real-time design system hot-reloading (watch v1.json for changes) — future enhancement
</deferred>

---

*Phase: 06-mythic-module*
*Context gathered: 2026-06-06 via planner derivation*
