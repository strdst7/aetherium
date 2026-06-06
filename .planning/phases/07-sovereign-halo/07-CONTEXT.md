# Phase 7: Sovereign Halo — Context

**Gathered:** 2026-06-06
**Status:** Ready for planning
**Source:** Planner derivation from ROADMAP.md + codebase analysis

<domain>
## Phase Boundary

Phase 7 delivers the Sovereign Halo — an output validation and enforcement layer that ensures every generated output conforms to identity law before delivery. It sits between the Mythic Module (Phase 6) and the Audit layer (Phase 8), receiving mythified outputs and either approving them, triggering regeneration with tightened constraints, or returning a structured failure report.

The Sovereign Halo formalizes and extends the existing ReflectiveService (which currently performs basic constraint checking and a single regeneration attempt) into a comprehensive validation engine with:
- Forbidden behavior detection (identity law violations)
- Tone deviation analysis (compare output against mythic tone schema)
- Symbolic drift detection (verify symbolic anchors are respected)
- Structured validation reports with confidence scores
- Bounded regeneration (max 3 attempts) with escalating constraints
- Graceful failure reporting when all regeneration attempts are exhausted

## Key Constraints

- All changes are additive (backward compatibility with Phase 1-6 APIs must be preserved)
- Validation must not add more than 200ms to the existing ≤200ms identity overhead budget
- MAX_REGENERATION_ATTEMPTS = 3 (configurable via options)
- Failure reports must never contain unvalidated raw LLM output
- ReflectiveService existing behavior must be preserved as a fallback when SovereignHaloService is not injected
</domain>

<decisions>
## Implementation Decisions

### Architecture
- **D-01**: Sovereign Halo is implemented as `SovereignHaloService` — a new service class that formalizes and extends the existing `ReflectiveService` validation patterns
- **D-02**: `SovereignHaloService` receives `IdentityConstraintEngine`, `MythicModule`, and `SymbolicAnchorLoader` as constructor dependencies (existing services, no new external integrations)
- **D-03**: Validation is compositional: each check (forbidden behavior, tone deviation, symbolic drift) is an independent validator function; the service aggregates results into a unified `ValidationReport`
- **D-04**: The existing `ReflectiveService` remains unchanged as an internal component; `SovereignHaloService` delegates forbidden-behavior checks to `IdentityConstraintEngine` and adds tone/symbolic checks on top

### Validation Rules
- **D-05**: Forbidden behavior checks use the existing `IdentityConstraintEngine.evaluate()` (must contain, must not contain, tone rules)
- **D-06**: Tone deviation compares output text against the `ToneModel` from `MythicIdentitySchema`: register match, intensity consistency, modifier presence
- **D-07**: Symbolic drift checks verify that symbolic anchors from the mythic schema appear in the output with appropriate frequency (at least one anchor reference required if anchors are defined and non-empty)
- **D-08**: Each validation check produces a `ValidationCheck` with `rule`, `passed`, `detail`, and `confidence` (0.0–1.0)

### Regeneration & Failure
- **D-09**: MAX_REGENERATION_ATTEMPTS = 3, stored as a constant and overridable via `OrchestratorRequest.options.maxHaloAttempts`
- **D-10**: Tightened constraints on regeneration: append all previous violation messages to the system prompt, reduce temperature by 0.1 per attempt (floor 0.1), add explicit "DO NOT:" list
- **D-11**: After 3 failed attempts, return a `FailureReport` with `status: "failed"`, `violationSummary`, `safeFallbackMessage` (static safe text, never the unvalidated output), and `attemptCount: 3`
- **D-12**: Failure report safe fallback message is derived from identity config or uses a system default: "The generation could not satisfy identity constraints. Please refine your request."

### Integration
- **D-13**: Orchestrator receives `SovereignHaloService` as an optional 5th constructor parameter (after mythicModule)
- **D-14**: If `sovereignHalo` is undefined, Orchestrator behavior is identical to Phase 6 (full backward compatibility); existing `ReflectiveService` check remains active
- **D-15**: When Sovereign Halo is active, it runs AFTER mythify and BEFORE the final response; the ReflectiveService check is superseded (not duplicated)
- **D-16**: `OrchestratorResponse` gets an optional `validationReport?: ValidationReport` field
- **D-17**: `ReasonResponse` gets an optional `validationReport?: ValidationReport` field (additive, no breaking change)
- **D-18**: MultiAgentOrchestrator validates each council agent's output individually through Sovereign Halo before final synthesis

### API Contracts
- **D-19**: Validation report is included in all `ReasonResponse` objects when Sovereign Halo is active
- **D-20**: Failure reports are returned as regular `ReasonResponse` with `status: "failed"` and the `validationReport` containing the failure details
- **D-21**: OpenAPI spec is updated with `ValidationReport`, `ValidationCheck`, `FailureReport` schemas (additive)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Identity & Mythic System
- `api/src/types/identity.ts` — SigilIdentity, IdentityConfig types
- `api/src/types/mythic.ts` — MythicIdentitySchema, ToneModel, VoiceModel, SymbolicAnchor, NarrativeConstraint
- `api/src/services/identity-constraints.ts` — IdentityConstraintEngine (evaluate rules)
- `api/src/services/mythic-module.ts` — MythicModule (generateSchema, mythify, generatePromptContext)
- `api/src/services/symbolic-anchor-loader.ts` — SymbolicAnchorLoader

### Orchestrator & Agent
- `api/src/services/orchestrator.ts` — process(), processWithTools(), OrchestratorContext, OrchestratorResponse
- `api/src/services/reflective-service.ts` — ReflectiveService, ReflectiveCheckResult
- `api/src/services/multi-agent-orchestrator.ts` — MultiAgentOrchestrator, runFlow()
- `api/src/services/agent-builder.ts` — AgentBuilder, execute(), executeTask()

### API Contracts
- `api/src/controllers/reason.ts` — ReasonRequest, ReasonResponse, ReasonController
- `api/src/controllers/multi-agent.ts` — Multi-agent controller
- `api/openapi.yml` — OpenAPI 3.0 specification
- `api/src/index.ts` — Express bootstrap, service initialization

### Tests
- `api/src/services/reflective-service.test.ts` — Existing reflective tests (patterns to follow)
- `api/src/services/mythic-module.test.ts` — Mythic module test patterns
</canonical_refs>

<specifics>
## Specific Ideas

- Validation confidence score is the average of all check confidences, weighted by check importance
- Forbidden behavior checks should include both explicit rules (from identity config) and implicit rules (no profanity, no PII leakage — basic content safety)
- Tone deviation can be measured by keyword matching against tone register + intensity heuristic (formal words count vs informal words count)
- Symbolic drift check should verify that at least one symbolic anchor concept appears in the output text
- Regeneration should log each attempt with attempt number, violations found, and temperature used (for audit trail in Phase 8)
- The failure report should include enough information for the caller to understand WHY validation failed without exposing the unvalidated output
</specifics>

<deferred>
## Deferred Ideas

- LLM-based validation (using a second LLM to judge output quality) — deferred to v2 due to latency budget
- Adaptive validation thresholds (learning per-identity acceptable deviation ranges) — future enhancement
- Real-time validation streaming (validating tokens as they generate) — requires streaming architecture, v2
- Cross-identity validation benchmarks (comparing output consistency across identities) — analytics feature, v2
</deferred>

---

*Phase: 07-sovereign-halo*
*Context gathered: 2026-06-06 via planner derivation*
