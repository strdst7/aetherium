# Spike Manifest

## Idea
Validate the Gemini provider end-to-end — the only provider with `supportsToolUse: true`, gating all tool-use and multi-step task capabilities. If Gemini doesn't work through the full pipeline (health check → generation → tool-use → embeddings → identity binding → orchestration), the platform cannot deliver on its core promise of tool-enabled, identity-consistent AI.

## Requirements
(emerging — to be updated as spike progresses)

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | gemini-full-path | standard | Given valid GEMINI_API_KEY, when full pipeline runs, then response is valid AND tool calls work AND audit record exists | PARTIAL ⚠ | gemini, provider, tool-use, pipeline |

## Requirements (emerging)
- Gemini model default must be `gemini-2.5-flash` or `gemini-2.5-pro` (not deprecated `gemini-1.5-pro`)
- Embedding model must be `gemini-embedding-2` (not deprecated `text-embedding-004`)
