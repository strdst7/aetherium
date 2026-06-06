# Aetherium Demo Runbook

**Total Target Time:** 3–5 minutes

## Timing Breakdown
- **Opening:** 30s
- **Single‑agent flow:** 60s
- **Multi‑agent council:** 75s
- **Memory trace visualization:** 45s
- **Governance & CI:** 45s
- **Closing:** 20s

## Pre‑demo Checklist
- [ ] **Services:** Docker Compose up (`infra/docker-compose.yml`) and health checks green.
- [ ] **Seeding:** Seed `mem_0001` (Identity Anchor) is present and retrievable.
- [ ] **Providers:** Primary provider (Ollama) is healthy; Mock provider is registered as fallback.
- [ ] **CI:** `node tools/sigil-validate.js` runs locally and returns expected JSON.
- [ ] **Browser:** Tabs open for: Web Shell, Agents, Memory, Governance, Storybook.
- [ ] **Recording:** Screen recorder ready and microphone tested.

## Live Demo Tips
- Use short, declarative narration lines.
- Pause 1–2 seconds after each major reveal to let judges absorb visuals.
- If a provider is slow, show the Memory Visualization while waiting to keep attention.

## Rehearsal Checklist
- [ ] **Dry runs:** 3 full runs timed and recorded.
- [ ] **Fallback plan:** If primary provider fails, toggle simulated failure and explain failover.
- [ ] **Edge cases:** Rehearse the violation flow twice (one geometry, one identity).
- [ ] **Timing:** Trim any section exceeding budget by 10s.
- [ ] **Clarity:** Ensure UI elements have visible labels and color coding (Red=Violation, Green=Approved).

## UX & Accessibility Standards
### Visual Hierarchy
- Candidate Output: neutral card with subtle shadow.
- Reflective Result: red border for violations, yellow for warnings, green for approved.
- Refined Output: green border and "Aligned with Sigil Law" badge.

### Microcopy
- Reflective header: "Reflective Verdict"
- Violation message: "Identity Violation — action blocked"
- Refined header: "Refined Answer — Identity Aligned"
- Agent panel labels: Archivist, Sigil Keeper, Narrator with short role subtitles.

### Accessibility
- Ensure color contrast meets 4.5:1 for text.
- Add `aria-live="polite"` to result containers.
- Keyboard focus: after submit, move focus to the result container.

### Motion
- Ease: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- Durations: 180–260ms (micro), 420–600ms (panels).
- Respect `prefers-reduced-motion`.
