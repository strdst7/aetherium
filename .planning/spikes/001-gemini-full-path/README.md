---
spike: 001
name: gemini-full-path
type: standard
validates: "Given a valid GEMINI_API_KEY, when the full Gemini pipeline runs (health → generate → generateWithTools → embed), then all methods return valid responses and the orchestrator can use Gemini as the primary provider"
verdict: PARTIAL
related: []
tags: [gemini, provider, tool-use, pipeline]
---

# Spike 001: Gemini Full Pipeline

## What This Validates
The Gemini provider (`api/src/adapters/gemini-provider.ts`) is registered at priority 0 and is the **only** provider with `supportsToolUse: true`. This spike validates the full pipeline against the real Gemini API.

## Research

### Approach Comparison

| Approach | Tool/Library | Pros | Cons | Status |
|----------|-------------|------|------|--------|
| Direct REST API (current) | raw fetch | No SDK dependency, full control | Manual response parsing | **Chosen** — matches existing impl |

### Key Risks (Pre-Spike)
- `gemini-1.5-pro` and `text-embedding-004` model names may be deprecated/unavailable
- Tool-use response `functionCall` parts may not parse correctly
- Health check endpoint may not match generation endpoint

## How to Run

```bash
export GEMINI_API_KEY="your-key"
./node_modules/.bin/tsc .planning/spikes/001-gemini-full-path/test-provider.ts \
  --outDir /tmp/spike-test --esModuleInterop --module commonjs --target es2020 \
  --moduleResolution node --skipLibCheck
node /tmp/spike-test/.planning/spikes/001-gemini-full-path/test-provider.js
```

## What to Expect

- healthCheck: ✓ returns `{ ok: true }` with correct model name
- generate: ✓ returns generated text
- generateWithTools: ✓ returns text + functionCall tool calls
- embed: ✗ fails — deprecated model name hardcoded in provider

## Investigation Trail

### Iteration 1 — Test with hardcoded `gemini-1.5-pro` (as-shipped)
- Result: ALL 4 tests fail with 404
- Finding: `gemini-1.5-pro` is fully deprecated. API returns: `"models/gemini-1.5-pro is not found for API version v1beta"`
- Discovery from ListModels: `gemini-2.5-flash` and `gemini-2.5-pro` are the current stable models
- Embedding model `text-embedding-004` also 404's. Available: `gemini-embedding-001`, `gemini-embedding-2`, `gemini-embedding-2-preview`

### Iteration 2 — Test with `gemini-2.5-flash` + updated constructor
- Result: 3/4 pass, embed still fails
- Finding: The `GeminiProvider.generate()` and `generateWithTools()` methods use `this.model` (from constructor), NOT `req.model` — so passing model name in the request object has no effect. The model must be set in the constructor.
- Tool-use WORKS: `get_weather({"city":"London"})` returned as a functionCall, correctly parsed by the existing parser.

### Iteration 3 — Embedding model discovery
- `gemini-embedding-001`, `gemini-embedding-2`, `gemini-embedding-2-preview` all work and return 3072-dimensional embeddings
- The embed method hardcodes `text-embedding-004` in the URL — this must be updated

## Results

### Verdict: PARTIAL ⚠

### What Works
- **healthCheck**: ✓ — Works with `gemini-2.5-flash`
- **generate**: ✓ — Text generation returns correct output
- **generateWithTools**: ✓ — Tool calls returned and parsed correctly (functionCall format)
- **Orchestrator pick**: ✓ — Provider registry correctly selects Gemini with `requireToolUse: true`

### What Needs Fixing
- **Model name**: `gemini-1.5-pro` hardcoded as default in constructor, must be `gemini-2.5-flash` or `gemini-2.5-pro`
- **Embedding model**: `text-embedding-004` hardcoded in embed URL, must be `gemini-embedding-2`
- **Health check model**: Uses constructor's `this.model` which defaults to the deprecated name — fix automatically if model default is updated

### API Compatibility
The raw REST API integration (no SDK) is correct:
- Request format: ✓ `contents[0].parts[0].text` structure is correct
- Response parsing: ✓ extracts text from `candidates[0].content.parts[0].text`
- Tool call parsing: ✓ extracts `functionCall.name` and `functionCall.args` from parts
- Error handling: ✓ returns descriptive errors
- Auth: ✓ `x-goog-api-key` header works

### Edge Cases Not Tested
- Streaming (not yet supported by provider, `supportsStreaming: false`)
- Concurrent requests with the same API key
- Rate limiting behavior
- Token counting / context window limits for tool-use with large prompts

### Impact
Fixing the model name defaults in `gemini-provider.ts` will resolve all 4 failing tests. The provider implementation is sound — only the model name constants are stale.
