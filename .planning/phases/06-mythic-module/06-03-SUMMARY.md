---
plan: 06-03
status: complete
executed: 2026-06-06
---

## Objective
Create Mythic Module Service (schema generation, mythify, generateMythicPrompt, neutral fallback)

## Accomplishments
- Created `api/src/services/mythic-module.ts`:
  - `generateSchema()` — produces MythicIdentitySchema from SigilIdentity
  - `generatePromptContext()` — builds system prompt extension with tone/voice/anchors
  - `mythify()` — rule-based text transformation (no second LLM call)
  - `generateMythicIdentity()` — resolves identity + cached config or generates new schema
  - `DEFAULT_NEUTRAL_MYTHIC` — zero-latency neutral fallback
- Implemented rule-based transformations:
  - Tone: ceremonial formality prepends ritualistic openings
  - Tone: arcane vocabulary replaces common words with elevated synonyms
  - Voice: first-person perspective converts "It is" → "I am"
  - Voice: spectral cadence adds ethereal phrasing
  - Symbolic: golden ratio anchors inject references to "golden proportion"
- Added sigil hash generation (SHA-256 of identityId + sorted anchors)

## Files Changed
- `api/src/services/mythic-module.ts` (new)
- `api/src/services/mythic-module.test.ts` (new)

## Tests
- Unit test: generateSchema produces valid schema
- Unit test: generateSchema returns neutral for neutral identity
- Unit test: generatePromptContext builds full context
- Unit test: mythify applies tone transformations
- Unit test: mythify applies voice transformations
- Unit test: mythify preserves neutral text
- Unit test: mythify returns metadata about applied transformations
- All tests pass (8/8)

## Notes
- Rule-based approach stays within latency budget (no second LLM call)
- Transformations are deterministic and testable
- MythicIdentitySchema is cached on identity for performance
