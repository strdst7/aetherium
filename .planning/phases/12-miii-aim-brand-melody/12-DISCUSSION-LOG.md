# Phase 12: MIII-AIM Brand Melody Injection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 12-MIII-AIM Brand Melody Injection
**Areas discussed:** Phase 12 scope boundary, Spike 001 cleanup, UAT strategy

---

## Phase 12 Scope Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 12 = brand injection only | 5-layer touch only. Infra/ops fixes are separate non-phase work. | |
| Phase 12 includes spike cleanup | Fold Gemini model fix into Phase 12, leave Docker/Vercel/Swagger separate. | |
| Everything is Phase 12 | All work done this session counts as Phase 12. Simplifies tracking. | ✓ |

**User's choice:** Everything is Phase 12
**Notes:** All work done during this session counts as Phase 12 — simpler tracking, one phase covers everything touched.

---

## Spike 001 Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcode new defaults | Change hardcoded strings to gemini-2.5-flash and gemini-embedding-2. Quick fix. | ✓ |
| Make model configurable via env var | Read model name from env var with fallback. More flexible but more changes. | |
| Accept PARTIAL and defer | Leave as-is with PARTIAL verdict. Defer to future provider rework. | |

**User's choice:** Hardcode new defaults
**Notes:** Matches existing pattern. No env var configuration at this time.

---

## UAT Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Resume test-by-test | Continue from test 1, go through each one for pass/fail. | ✓ |
| Batch verify remaining 5 | Verify tests 2-6 together, code-check what we can. | |
| Automate what we can | Convert code-level checks to Jest tests. Visual checks remain manual. | |

**User's choice:** Resume test-by-test, then opted for visual verification
**Notes:** Visual UAT deferred — user will verify header/footer/footnote/button in browser. Tests 5-6 (tokens, mythic presets) code-verified as implemented.

---

## OpenCode's Discretion

None — all areas were discussed with user input.

## Deferred Ideas

- Full MIII-AIM brand rollout — separate initiative, not in Phase 12 scope
- Env-var configuration for Gemini model name — deferred, simple hardcode sufficient for now
