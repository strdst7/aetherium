# Spike Conventions

## Stack
- **Runtime:** Node.js 20 with TypeScript (project-aligned)
- **API calls:** raw fetch (no SDK dependency — Gemini provider uses REST API directly)
- **Testing:** Standalone scripts run via `npx ts-node` or direct `node` with compiled JS

## Structure
- Each spike in `.planning/spikes/NNN-name/`
- Test scripts named by concern: `test-provider.ts`, `test-pipeline.ts`
- API key read from `GEMINI_API_KEY` env var (never hardcoded)
- Compile with project tsc before running: `./node_modules/.bin/tsc <file> --outDir /tmp/...`

## Patterns
- Provider-only tests call `GeminiProvider` methods directly
- Pipeline tests go through `Orchestrator.process()` or the full bootstrap
- Spike test scripts live in the spike dir, compiled to /tmp for execution
