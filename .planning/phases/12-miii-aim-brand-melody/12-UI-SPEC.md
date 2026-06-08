---
phase: 12
slug: miii-aim-brand-melody
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-07
---

# Phase 12 — UI Design Contract

> Visual and interaction contract for MIII-AIM brand essence injection into Aetherium.
> Design-essence phase — adds secondary branding layer without altering existing layout or interactions.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (inline styles) |
| Preset | not applicable |
| Component library | none (inline styles) |
| Icon library | unicode glyphs (`×`, `⊹`, `·`) |
| Font | system-ui, -apple-system, sans-serif (unchanged) |

---

## Spacing Scale

No new spacing tokens added. Existing Aetherium spacing scale used throughout:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | -- |
| sm | 8px | -- |
| md | 16px | Header padding |
| lg | 24px | Footer padding, header padding |
| xl | 32px | -- |
| 2xl | 48px | -- |
| 3xl | 64px | -- |

Exceptions: none

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Brand title | 1.5em | 700 | normal |
| Brand suffix | 1em | 500 | normal |
| Brand separator | 1.2em | 300 | normal |
| Footer | 0.8em | 400 | normal |
| Footnote | 0.8em | 400 | normal |

---

## Color

### New MIII-AIM Palette (added to design/sigil/v1.json)

| Token | Value | Usage |
|-------|-------|-------|
| secondary-300 (gold) | `#D9C27A` | Brand separator, footer accent, footnote accent, Button(gold) variant |
| obsidian-800 | `#0A0A0A` | Button(gold) text color |
| silver-300 | `#C9D1D9` | Design token reserve |
| violet-600 | `#3A1F5D` | Design token reserve |

### Existing Aetherium Palette (unchanged)

| Role | Value | Usage |
|------|-------|-------|
| Dominant | `#f8f9fa` | Page background |
| Surface | `#ffffff` | Cards, header, sections |
| Primary blue | `#3498db` | Header border, buttons, links |
| Text | `#2c3e50` | Brand title, nav links |
| Muted | `#7f8c8d` | Labels, secondary text |
| Muted lighter | `#9ca3af` | Footer, footnote |

### Brand Hierarchy

```
⚡ Aetherium × MIII-AIM
^ primary    ^ gold    ^ muted
```

Gold (`#D9C27A`) reserved for:
- `×` brand separator in header
- `⊹` decorative glyph in footer and footnote
- `·` dot separator in footnote
- Button `variant="gold"` background

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Header brand | `⚡ Aetherium × MIII-AIM` |
| Footer | `⊹ Powered by MIII-AIM Engine` |
| Landing page footnote | `⊹ Architecture: MIII-AIM Sovereign Engine v1.0 · Identity-routed via Aetherium Crystal Core` |
| Button variant label | `gold` (programmatic prop, not display text) |

---

## Interaction Design

### Header Brand
- Existing `⚡ Aetherium` text preserved, unchanged
- Gold `×` separator added after Aetherium, styled with `#D9C27A`, `fontWeight: 300`
- MIII-AIM suffix added after separator, styled with `#6b7280`, `fontWeight: 500`, `letterSpacing: 0.02em`

### Footer (new)
- Centered, muted text (`#9ca3af`), `0.8em`
- Gold `⊹` decorative glyph preceding text
- Separated from main content by `1px solid #e5e7eb` top border

### Landing Page Footnote (new)
- Below main test section, before closing container
- Gold `⊹` glyph + architecture text + gold `·` dot + routing note
- Separated by `1px solid #e5e7eb` top border, `40px` margin-top

### Button Variant
- `Button` component accepts `variant?: 'primary' | 'gold'` prop
- `variant="gold"`: background `#D9C27A`, text `#0A0A0A` (obsidian)
- Default `variant="primary"`: background `#4F46E5` (indigo, unchanged)

### Mythic Module Voice Presets
- `"sovereign"` tone: intensity 0.8, modifiers `["architectural", "ritualistic"]`
- `"architectural"` voice: vocabulary `"precise"`, sentenceStructure `"structured"`, pacing `"deliberate"`
- `makeSovereign()` transformation: replaces tentative language ("I think" → "It is determined that"), action verbs elevated ("use" → "invoke", "make" → "forge"), appends `[⊹ Stamped by Sovereign Accord — sigil bound]`
- `makeArchitectural()` transformation: uses Roman numeral enumeration ("first" → "I."), replaces connective language ("because" → "per", "example" → "exemplar", "part" → "module", "group" → "cluster")

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none | -- | not required |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — all copy aligns with MIII-AIM sovereign voice
- [x] Dimension 2 Visuals: PASS — additive only, no existing visual contracts broken
- [x] Dimension 3 Color: PASS — gold/obsidian used only in reserved roles; existing palette untouched
- [x] Dimension 4 Typography: PASS — no new font families; existing scale respected
- [x] Dimension 5 Spacing: PASS — only existing spacing tokens used
- [x] Dimension 6 Registry Safety: PASS — no external registries introduced

**Approval:** approved 2026-06-07
