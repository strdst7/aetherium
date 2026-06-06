# Phase 7: Sovereign Halo — Technical Research

**Researched:** 2026-06-06
**Phase:** 7 — Sovereign Halo (Output Validation & Enforcement)

## Domain Analysis

### Existing Validation Layer (ReflectiveService)
The codebase already has a `ReflectiveService` in `api/src/services/reflective-service.ts` that:
- Checks for sigil geometry violations ("rotate the sigil", "flip the sigil")
- Checks for identity contradictions against high-identity memories
- Delegates to `IdentityConstraintEngine` for "must contain", "must not contain", and "tone" rules
- Returns `approved | refine | reject` status
- Is called by Orchestrator after generation but before returning response
- Already implements a single regeneration attempt when status is "refine"

### Existing Mythic Module (MythicModule)
The `MythicModule` in `api/src/services/mythic-module.ts`:
- Generates `MythicIdentitySchema` from `SigilIdentity` (tone, voice, symbolic anchors, constraints)
- Provides `mythify()` that rewrites LLM output to match identity tone/voice
- Returns `MythifyResult` with `output`, `applied`, `transformations`, `confidence`
- Is called by Orchestrator after generation

### Identity Constraint Engine (IdentityConstraintEngine)
In `api/src/services/identity-constraints.ts`:
- Evaluates "must contain: X", "must not contain: X", "tone: X" rules
- Returns `IdentityConstraintResult` with `passed`, `violations`, `ruleChecks`
- Used by ReflectiveService when identity is provided

## Technical Approach

### SovereignHaloService Design
**Pattern:** Compositional validator with aggregated reporting

```
SovereignHaloService
├── validate(output, identity, mythicSchema): ValidationReport
│   ├── checkForbiddenBehaviors(output, identity) → ValidationCheck[]
│   ├── checkToneDeviation(output, mythicSchema) → ValidationCheck[]
│   ├── checkSymbolicDrift(output, mythicSchema) → ValidationCheck[]
│   └── aggregate(checks) → ValidationReport
├── regenerateWithConstraints(prompt, violations, attemptNumber): string
├── generateFailureReport(report, attemptCount): FailureReport
└── constants: MAX_ATTEMPTS = 3
```

### Integration Points
1. **Orchestrator constructor** — add optional 5th param `sovereignHalo?: SovereignHaloService`
2. **Orchestrator.process()** — after mythify, call `sovereignHalo.validate()`; if fail and attempts < 3, regenerate; if fail and attempts >= 3, return failure report
3. **OrchestratorResponse** — add optional `validationReport?: ValidationReport`
4. **ReasonResponse** — add optional `validationReport?: ValidationReport`
5. **MultiAgentOrchestrator** — validate each agent output before final synthesis

### Regeneration Strategy
When validation fails:
1. Collect all violations from ValidationReport
2. Build tightened prompt = original prompt + "CONSTRAINTS: {violations}" + "DO NOT: {forbidden}"
3. Reduce temperature by 0.1 (floor 0.1)
4. Regenerate
5. Re-validate
6. Repeat up to MAX_ATTEMPTS

### Failure Report Structure
```typescript
interface FailureReport {
  status: "failed";
  attemptCount: number;
  violationSummary: string[];
  safeFallbackMessage: string;
  lastValidationReport: ValidationReport;
}
```

## Stack Alignment
- **TypeScript 5.1** — Standard class-based service, consistent with existing services
- **Express 4.x** — Additive API changes, no route modifications needed
- **Jest 30** — Co-located tests following existing patterns
- **No new dependencies** — All validators use existing services and string operations

## Pitfalls to Avoid
1. **Latency budget** — Validation must stay under 200ms overhead. Avoid LLM-based validation (deferred to v2).
2. **Infinite loops** — MAX_ATTEMPTS must be strictly enforced; never allow unbounded regeneration.
3. **Backward compatibility** — All new fields optional; existing API consumers must not break.
4. **Failure report safety** — Never include raw unvalidated output in failure report.
5. **Double validation** — When Sovereign Halo is active, skip ReflectiveService to avoid redundant checks.

## Out of Scope
- LLM-as-judge validation (latency exceeds budget)
- Streaming validation (requires architectural change)
- Cross-identity consistency benchmarking (analytics, v2)
- Adaptive threshold learning (requires dataset, v2)

---

*Research complete. Ready for planning.*
