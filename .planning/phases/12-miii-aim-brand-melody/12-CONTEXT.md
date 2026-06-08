# Phase 12: MIII-AIM Brand Melody Injection - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 is a post-roadmap extra phase that injects the MIII-AIM brand "shade/hint" into Aetherium across 5 layers: design tokens, mythic voice presets, header branding, landing page footnote, and button gold variant. It is a light touch — NOT a full brand rollout.

All work done during this session counts toward Phase 12, including:
- 5-layer brand touch (tokens, mythic, header, footnote, button)
- Spike 001 cleanup (Gemini model defaults fix)
- Infrastructure fixes (Docker healthchecks, env_file path, Vercel vercel.json, Google Cloud root route)
- requireToolUse fix (conditional on tools.length > 0)
- Swagger type fix (docs.ts overload resolution)
- AGENTS.md update

</domain>

<decisions>
## Implementation Decisions

### Scope
- **D-01:** Everything done this session counts as Phase 12 — simpler tracking, one phase covers all touched areas
- **D-02:** This is a light "shade/hint" only — full MIII-AIM brand rollout deferred to separate initiative

### Gemini Model Defaults (Spike 001 Cleanup)
- **D-03:** Hardcode new defaults in `api/src/adapters/gemini-provider.ts`:
  - Constructor default: `gemini-1.5-pro` → `gemini-2.5-flash`
  - Embed URL: `text-embedding-004` → `gemini-embedding-2`
- **D-04:** Matches existing pattern (no env var configuration for model name at this time)

### UAT
- **D-05:** 6 tests defined in 12-UAT.md — visual verification deferred (user will verify in browser)
- **D-06:** Tests 1-4 (header, footer, footnote, button) are visual; tests 5-6 (tokens, mythic presets) are code-level — all code-verified as implemented

### Implementation (Already Applied)
- **12-01:** Design tokens — added secondary (gold #D9C27A), obsidian (#0A0A0A), silver (#C9D1D9), violet (#3A1F5D) palettes + MIII-AIM compliance rules to `design/sigil/v1.json`
- **12-02:** Mythic voice presets — added `"sovereign"` and `"architectural"` tones + `makeSovereign()` / `makeArchitectural()` transformations to `api/src/services/mythic-module.ts`
- **12-03:** Layout header — `⚡ Aetherium × MIII-AIM` with gold separator; footer `⊹ Powered by MIII-AIM Engine`; button gold variant (`web/components/Layout.tsx`, `web/components/Button.tsx`)
- **12-04:** Landing page footnote — `⊹ Architecture: MIII-AIM Sovereign Engine v1.0 · Identity-routed via Aetherium Crystal Core` (`web/pages/index.tsx`)
- **Docker fix:** `env_file: ../.env-local` in `infra/docker-compose.yml`; MongoDB 6→7 with healthcheck; Redis→7-alpine with healthcheck; `depends_on` uses `condition: service_healthy`; memory limits bumped
- **Vercel fix:** Created `vercel.json` at project root with `rootDirectory: "web"` and `framework: "nextjs"`
- **Google Cloud fix:** Added `GET /` root route in `api/src/index.ts` serving HTML landing page
- **requireToolUse fix:** Made conditional on `tools.length > 0` in `orchestrator.ts` and `agent-builder.ts`
- **Swagger type fix:** Stored `swaggerUi.setup()` result to avoid overload resolution error

### Pending Work
- **Gemini model defaults:** Apply hardcoded fix to `api/src/adapters/gemini-provider.ts` (D-03)
- **UAT completion:** User to visually verify tests 1-4 when app is running

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `design/sigil/v1.json` — Design tokens source of truth (MIII-AIM palettes added)
- `web/src/tokens.ts` — Generated token utilities (needs regeneration if tokens change)

### Mythic Module
- `api/src/services/mythic-module.ts` — MythicModule with sovereign/architectural presets
- `api/src/types/mythic.ts` — ToneModel, VoiceModel, SymbolicAnchor types

### Web UI
- `web/components/Layout.tsx` — Header with MIII-AIM branding + footer
- `web/components/Button.tsx` — Gold variant added
- `web/pages/index.tsx` — Landing page with architecture footnote

### Provider
- `api/src/adapters/gemini-provider.ts` — Needs model defaults fix (spike 001)
- `api/src/services/orchestrator.ts` — requireToolUse fix applied
- `api/src/services/agent-builder.ts` — requireToolUse fix applied

### Infrastructure
- `infra/docker-compose.yml` — Fixed healthchecks, env_file, resource limits
- `vercel.json` — Root-level Vercel config for web deployment
- `api/src/index.ts` — GET / root route for Google Cloud

### Spike
- `.planning/spikes/001-gemini-full-path/README.md` — Spike 001 findings (PARTIAL verdict)

### UAT
- `.planning/phases/12-miii-aim-brand-melody/12-UAT.md` — 6 UAT tests defined
- `.planning/phases/12-miii-aim-brand-melody/12-UI-SPEC.md` — UI design contract (6/6 PASS)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `design/sigil/v1.json` — Design token structure (colors, ratios, compliance rules) — extended with MIII-AIM palettes
- `web/components/Layout.tsx` — Shared layout with header/nav/footer — header/footer branding applied
- `web/components/Button.tsx` — Button component with variant prop — gold variant added
- `api/src/services/mythic-module.ts` — Mythic service with tone/voice transformation — sovereign/architectural presets added

### Established Patterns
- Inline `React.CSSProperties` for styling (no CSS modules) — all brand styling uses this pattern
- Named exports, 2-space indentation, quote style varies by file

### Integration Points
- `api/src/bootstrap/providers.ts` — Provider registration (Gemini at priority 0)
- `api/src/index.ts` — Express bootstrap (root route, service wiring)
- `web/components/Layout.tsx` — Shared layout wrapper used by all pages

</code_context>

<specifics>
## Specific Ideas

- MIII-AIM brand is a "shade/hint" only — subtle presence, not full visual overhaul
- Gold (#D9C27A) as the primary MIII-AIM accent, paired with obsidian (#0A0A0A) for contrast
- Sovereign tone: authoritative, declarative, ceremonial register
- Architectural tone: structured, precise, blueprint-like character

</specifics>

<deferred>
## Deferred Ideas

- Full MIII-AIM brand rollout — separate initiative, not in Phase 12 scope
- Env-var configuration for Gemini model name — deferred, simple hardcode sufficient for now

</deferred>

---

*Phase: 12-miii-aim-brand-melody*
*Context gathered: 2026-06-08*
