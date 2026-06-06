---
plan: 06-01
status: complete
executed: 2026-06-06
---

## Objective
Create Mythic Schema & Types (ToneModel, VoiceModel, SymbolicAnchor, DEFAULT_NEUTRAL_MYTHIC)

## Accomplishments
- Created `api/src/types/mythic.ts` with core type definitions:
  - `ToneModel` (temperature, formality, vocabulary, emotion)
  - `VoiceModel` (perspective, cadence, dialect, presence)
  - `SymbolicAnchor` (name, weight, description, category)
  - `NarrativeConstraint` (scope, required, forbidden)
  - `MythicIdentitySchema` (combines all above + sigil hash)
- Defined `DEFAULT_NEUTRAL_MYTHIC` for zero-latency fallback
- Updated `SigilIdentity.config` with optional `mythic?: MythicIdentity` field
- All types are additive and preserve backward compatibility

## Files Changed
- `api/src/types/mythic.ts` (new)

## Tests
- Type-level verification only (no runtime tests needed for type definitions)

## Notes
- Type definitions are the foundation for all subsequent Mythic Module work
- DEFAULT_NEUTRAL_MYTHIC uses empty arrays and neutral values to ensure no transformation when identity is not specified
