# Phase 9: Web UI Extensions — UI Design Contract

**Phase:** 9 — Web UI Extensions  
**Generated:** 2026-06-06  
**Design System:** `design/sigil/v1.json` (Aetherium Sigil)

## Visual Language

- **Crystalline geometry**: sharp edges, precise ratios (sigil_core 1:1.414), consistent border radii.
- **Ritualized interfaces**: deliberate spacing, motion with purpose, no gratuitous animation.
- **Color palette**: primary (blues), accent (reds/oranges), neutral (grays). Semantic colors for success/warning/error/info.
- **Typography**: system sans-serif for UI, monospace for data/traces.

## Layout

- **Shared header**: full-width, sticky top, contains brand title + horizontal nav links + `IdentitySelector` dropdown aligned right.
- **Content area**: max-width 1200px, centered, 20px padding, white card sections on `#f8f9fa` background.
- **Navigation links**: Home (Identity Test), Register Identity, Memory Inspection, Agents, Governance.

## Component Patterns

- **Inline CSS objects**: all styling via `style={styles.object}` (existing codebase convention).
- **Cards**: white background, 8px border-radius, subtle shadow (`0 2px 4px rgba(0,0,0,0.1)`), 20px padding.
- **Forms**: label above input, 10px padding inputs, 1px `#bdc3c7` border, 4px border-radius.
- **Buttons**: 12px 20px padding, `#3498db` background, white text, 4px border-radius, bold font.
- **Status badges**: colored backgrounds matching semantic tokens (green approved, yellow refine, red reject).
- **Expandable sections**: click header to toggle `<pre>` detail block.

## Pages

| Page | Route | Purpose |
|------|-------|---------|
| Identity Test | `/` | Select identity, submit prompt, view output + trace + validation |
| Identity Registration | `/identity/register` | Create a new SigilIdentity via form |
| Memory Inspection | `/memory` | Visualize and filter memory shards by identity |
| Agents | `/agents` | Multi-agent council demo (existing) |
| Governance | `/governance` | Governance page (existing) |

## Identity Selector

- Dropdown (`<select>`) populated from `GET /identity`.
- Display `name` as label, `identity_id` as value.
- Placed in shared header so it is visible on every page.
- Managed via React Context to persist selection across navigations.

## Accessibility

- `aria-live="polite"` on result containers.
- Focus management for new content (useRef + focus on result mount).
- Sufficient color contrast per semantic tokens.
