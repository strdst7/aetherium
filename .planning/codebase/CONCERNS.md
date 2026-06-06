# Codebase Concerns

**Analysis Date:** 2026-06-06

## Tech Debt

### Excessive `any` Types & Disabled Strict Mode
- Issue: The codebase uses `any` extensively, undermining TypeScript's type safety. The web app's `tsconfig.json` has `"strict": false`, which permits implicit `any` and unsound type behavior.
- Files: `web/tsconfig.json`, `api/src/adapters/ai-adapter.ts`, `api/src/services/orchestrator.ts`, `api/src/services/memory-service.ts`, `api/src/services/reflective-service.ts`, `api/src/controllers/reason.ts`, `api/src/agents/types.ts`, `web/pages/agents.tsx`, `web/pages/memory.tsx`
- Impact: Refactoring is dangerous; runtime errors that TypeScript should catch go undetected.
- Fix approach: Enable `"strict": true` in `web/tsconfig.json`, replace all `any` with proper interfaces, and use unknown for truly opaque values.

### In-Memory Vector Search in JavaScript
- Issue: `MemoryService.vectorSearch` fetches every document with an embedding from MongoDB into memory, then computes cosine similarity in JS.
- File: `api/src/services/memory-service.ts` (lines 72-97)
- Impact: O(n) memory and CPU per query. Performance degrades linearly; unsuitable beyond a few thousand memory documents.
- Fix approach: Use MongoDB Atlas Vector Search or a dedicated vector DB (e.g., Pinecone, Weaviate, pgvector). Alternatively, implement pagination or approximate nearest neighbor indexing.

### Stub SigilValidator in Production Service
- Issue: `tools/sigil-keeper-service.ts` contains a `SigilValidator` class that is a complete stub—`validateSVG` and `validateCSS` always return passing scores with zero violations.
- File: `tools/sigil-keeper-service.ts` (lines 200-216)
- Impact: The standalone validation service provides false confidence. Any artifact uploaded will pass compliance.
- Fix approach: Implement real parsing logic or delegate to a library like `cheerio` for SVG and `postcss` for CSS to check against `design/sigil/v1.json` rules.

### Hardcoded Violation Detection in ReflectiveService
- Issue: `ReflectiveService.evaluate` uses brittle string inclusion checks (`text.includes("rotate the sigil")`, `text.includes("halo arc is square")`).
- File: `api/src/services/reflective-service.ts` (lines 22-51)
- Impact: Easily bypassed by rephrasing. Not robust for real-world identity governance.
- Fix approach: Use a proper NLP classifier, regex patterns, or an LLM-based evaluator with structured output constraints.

### Mock Provider Registered in Production Bootstrap
- Issue: `api/src/bootstrap/providers.ts` unconditionally registers `MockProvider` as a fallback in the provider registry during application startup.
- File: `api/src/bootstrap/providers.ts` (lines 18-22)
- Impact: Production deployments may silently fall back to a deterministic mock response instead of failing loudly when the primary provider is unavailable.
- Fix approach: Only register `MockProvider` when `NODE_ENV === 'test'` or `development`. In production, fail fast with a clear error.

### Jest Mock Reimplementation in Runtime Script
- Issue: `api/src/run_demo.ts` manually reimplements `jest.fn()` inline to allow the script to run outside of Jest. This is a hack for a demo script.
- File: `api/src/run_demo.ts` (lines 62-75)
- Impact: Brittle, unmaintainable, and confuses the runtime environment. The script should not need Jest mocks at all.
- Fix approach: Refactor the script to use proper dependency injection or simple factory functions instead of mocking.

## Known Bugs

### Failing Frontend Test Expectation
- Symptoms: `web/src/index.test.tsx` expects text `"Refined Output (Identity‑Aligned)"`, but the actual rendered text in `web/pages/index.tsx` is `"Refined Answer — Identity Aligned"`.
- Files: `web/src/index.test.tsx` (line 89), `web/pages/index.tsx` (line 206)
- Trigger: Running `jest` in the `web/` directory will cause this test to fail.
- Workaround: Update the test expectation string to match the component output.

### ProviderRegistry.defaultProvider Throws on Empty Registry
- Symptoms: Calling `ProviderRegistry.instance.defaultProvider` before any provider is registered causes an unhandled `TypeError: Cannot read properties of undefined`.
- File: `api/src/services/provider-registry.ts` (lines 74-76)
- Trigger: `memoryService.embedQuery` invokes `ProviderRegistryInstance.defaultProvider` before bootstrap completes or if bootstrap fails.
- Workaround: Add a bounds check and throw a descriptive error.

### Route Mounting Conflicts
- Symptoms: Multiple routers mounted at `"/"` in `api/src/index.ts` (`failoverRouter`, `createMemoryRouter`, `createMultiAgentRouter`). If any of these define overlapping paths, Express resolves them in registration order, which can mask bugs.
- File: `api/src/index.ts` (lines 18, 61, 66)
- Trigger: Adding a catch-all or health route in a sub-router could shadow other routes.
- Workaround: Mount routers at distinct prefixes (e.g., `/api/failover`, `/api/memory`, `/api/multi-agent`).

### ReflectiveService Never Returns "reject" Status
- Symptoms: The `ReflectiveCheckResult` type allows `"approved" | "refine" | "reject"`, but `ReflectiveService.evaluate` only returns `"approved"` or `"refine"`.
- File: `api/src/services/reflective-service.ts` (lines 48-50)
- Trigger: Any codepath expecting a `"reject"` status will never receive it.
- Workaround: Update the type to remove `"reject"` or implement logic that returns it.

## Security Considerations

### Overly Permissive CORS
- Risk: The API allows any origin (`"*"`) and exposes the server to cross-origin attacks.
- Files: `api/src/index.ts` (lines 21-30)
- Current mitigation: None.
- Recommendations: Restrict `Access-Control-Allow-Origin` to known domains or use a whitelist. Avoid `*` in production.

### Unauthenticated Force-Fail Endpoint
- Risk: `GET /api/forceFail?on=true` lets any client toggle global provider failure state with no authentication.
- Files: `api/src/controllers/failover.ts`
- Current mitigation: None.
- Recommendations: Remove this endpoint in production builds, gate it behind admin auth, or restrict to `localhost`.

### No Rate Limiting
- Risk: All API endpoints (`/v1/reason`, `/v1/multi-agent`, `/v1/memory/*`) are exposed without rate limiting, making them vulnerable to brute force and abuse.
- Files: `api/src/index.ts`, `api/src/controllers/reason.ts`, `api/src/controllers/multi-agent.ts`, `api/src/controllers/memory.ts`
- Current mitigation: None.
- Recommendations: Integrate `express-rate-limit` or a reverse-proxy rate limiter.

### Unrestricted File Upload in Sigil Keeper
- Risk: `tools/sigil-keeper-service.ts` uses `multer` with default `memoryStorage` and no file size/type enforcement beyond a string suffix check.
- Files: `tools/sigil-keeper-service.ts` (lines 18, 96-121)
- Current mitigation: Filename extension check only.
- Recommendations: Add `limits: { fileSize: ... }`, validate MIME types, and scan uploaded content for malicious XML/SVG before processing.

## Performance Bottlenecks

### Client-Side UMAP on Full Embedding Set
- Problem: `web/pages/memory.tsx` fetches all memories and runs UMAP dimensionality reduction in the browser on every page load.
- Files: `web/pages/memory.tsx` (lines 37-97)
- Cause: UMAP is computationally expensive and blocks the main thread.
- Improvement path: Pre-compute 2D coordinates server-side, use Web Workers for UMAP, or implement progressive loading with pagination.

### No Embedding or Response Caching
- Problem: Every query triggers a fresh embedding generation via `MemoryService.embedQuery` and a fresh LLM call via the provider.
- Files: `api/src/services/memory-service.ts` (lines 128-137), `api/src/services/orchestrator.ts` (lines 43-70)
- Cause: No Redis, in-memory cache, or memoization layer.
- Improvement path: Add an LRU cache for identical queries (respecting TTL), or integrate Redis for distributed caching.

### Synchronous Fetch with No Timeouts
- Problem: `OllamaProvider.generate`, `embed`, and `healthCheck` use `fetch` without `AbortController` or timeout options.
- Files: `api/src/adapters/ollama-provider.ts` (lines 36, 76, 122)
- Cause: A hanging Ollama server will block the request indefinitely.
- Improvement path: Wrap fetch calls with an `AbortSignal` and implement retry logic with exponential backoff.

## Fragile Areas

### ProviderRegistry.pick Logic Ambiguity
- Files: `api/src/services/provider-registry.ts` (lines 57-66)
- Why fragile: The health check condition `if (!health || health.ok !== false)` is confusing. A provider that returns `health.ok = undefined` is treated as healthy. Silent misbehavior if a provider returns an unexpected shape.
- Safe modification: Rewrite the condition to explicitly require `health.ok === true`.

### MongoDB Connection Without Retry
- Files: `api/src/services/memory-service.ts` (lines 25-28), `api/src/index.ts` (lines 38-44)
- Why fragile: `bootstrap` calls `memoryService.connect` once. If MongoDB is temporarily unavailable, the entire process exits with code 1.
- Safe modification: Implement connection retry with `exponential-backoff` and a graceful degradation path.

### Dependency on Global Singletons
- Files: `api/src/services/provider-registry.ts` (`ProviderRegistry.instance`), `api/src/agents/narrator.ts` (`ProviderRegistryInstance`)
- Why fragile: Singletons make unit testing harder and hide implicit dependencies. `Narrator` directly imports the global registry instance.
- Safe modification: Inject the registry via constructor arguments.

## Scaling Limits

### Memory Vector Search
- Current capacity: In-memory JS cosine similarity over all documents.
- Limit: Thousands of documents before latency becomes unacceptable.
- Scaling path: Migrate to MongoDB Atlas Vector Search or a dedicated vector database.

### Embedding Dimension Mismatch
- Current capacity: `cosineSimilarity` uses `Math.min(a.length, b.length)`.
- Limit: If embeddings vary in dimension, comparisons are silently truncated, degrading accuracy.
- Scaling path: Enforce a fixed embedding dimension in `MemoryDocument` and reject mismatched vectors.

## Dependencies at Risk

### `umap-js`
- Risk: The client-side memory visualization depends on `umap-js` v1.4.0. It is a niche package with limited maintenance.
- Impact: Visualization breaks if the package has an unpatched bug or becomes incompatible with future React/Next.js versions.
- Migration plan: Evaluate `@umap-js/umap` alternatives or pre-compute coordinates server-side to remove the client dependency entirely.

### `multer` (Missing from Package Manifest)
- Risk: `tools/sigil-keeper-service.ts` imports `multer`, but `api/package.json` does not list it as a dependency. The `tools/` directory has no `package.json` of its own.
- Impact: The service will crash at runtime when `multer` is required.
- Migration plan: Add `multer` to `api/package.json` or create a separate `package.json` for `tools/`.

## Missing Critical Features

### Authentication & Authorization
- Problem: No auth layer on any API endpoint. Any client can query reasoning, view all memories, and toggle provider failure.
- Blocks: Production deployment, multi-tenant usage, secure access control.

### Structured Logging
- Problem: Only `console.log` / `console.error` are used. No correlation IDs, log levels, or structured format (JSON).
- Blocks: Observability, debugging in production, integration with log aggregators.

### Input Validation & Sanitization
- Problem: Request bodies are not validated beyond basic presence checks. No schema validation (e.g., Zod, Joi) on `/v1/reason`, `/v1/multi-agent`, or `/v1/validate/*`.
- Blocks: Safe handling of malformed or malicious payloads.

### CI Pipeline Artifacts
- Problem: `docs/runbook.md` references `infra/docker-compose.yml` and `node tools/sigil-validate.js`, neither of which exist in the repo. `compliance_report.json` references `web/components/BadSigil.svg`, which also does not exist.
- Blocks: The demo runbook and CI instructions cannot be followed verbatim.

## Test Coverage Gaps

### MemoryService Logic Untested
- What's not tested: Actual `MemoryService` methods (`connect`, `upsertMemory`, `getById`, `vectorSearch`, `deleteById`, `clear`, `getAll`, `embedQuery`).
- Files: `api/src/services/memory-service.test.ts`
- Risk: The existing test only copies the `cosineSimilarity` function locally and tests that copy, not the real service. A bug in the service's vector search or embedding logic would go unnoticed.
- Priority: High

### Multi-Agent Orchestrator & Agents Untested
- What's not tested: `MultiAgentOrchestrator`, `Archivist`, `SigilKeeper`, `Narrator`.
- Files: `api/src/services/multi-agent-orchestrator.ts`, `api/src/agents/archivist.ts`, `api/src/agents/sigil-keeper.ts`, `api/src/agents/narrator.ts`
- Risk: The core multi-agent council flow has zero automated tests.
- Priority: High

### Frontend Page Tests Missing
- What's not tested: `web/pages/agents.tsx`, `web/pages/memory.tsx`, `web/pages/governance.tsx`.
- Files: `web/pages/*`
- Risk: UI regressions in the Agents demo, Memory visualization, and Governance pages are not caught.
- Priority: Medium

### API Controller Integration Tests Missing
- What's not tested: `ReasonController`, `createMultiAgentRouter`, `failoverRouter`.
- Files: `api/src/controllers/reason.ts`, `api/src/controllers/multi-agent.ts`, `api/src/controllers/failover.ts`
- Risk: Endpoint behavior changes (status codes, response shapes) are not validated.
- Priority: Medium

### Sigil Keeper Service Tests Missing
- What's not tested: All endpoints in `tools/sigil-keeper-service.ts`.
- Files: `tools/sigil-keeper-service.ts`
- Risk: The stub validator is never exercised in tests.
- Priority: Low (since the validator is a stub anyway)

---

*Concerns audit: 2026-06-06*
