# Spike Proposals — High-Risk, Unproven Areas

**Analysis Date:** Mon Jun 08 2026

## Spike 1: `gemini-full-path`

**What's unknown:** The Gemini provider (`api/src/adapters/gemini-provider.ts`) is registered at priority 0 — the highest — and is the **only** provider with `supportsToolUse: true`. But `GEMINI_API_KEY` is never set in any `.env*` file. Bootstrap (`api/src/index.ts:141-145`) logs `"Gemini provider health: unavailable (API key may be missing)"`. Every code path that requires `requireToolUse` (the entire `AgentBuilder.execute`, `AgentBuilder.executeTask`, `Orchestrator.processWithTools`, `Orchestrator.generatePlan`) will hit `"No healthy providers available"` if Gemini is the only candidate, or silently fall through to Ollama/Mock which throw `"Provider does not support tool use"`. The full Gemini pipeline — generation, tool-use, embeddings — has never been exercised end-to-end.

**Given/When/Then:**
```text
GIVEN a valid GEMINI_API_KEY is configured
WHEN the full pipeline runs (register identity → embed query → 
     retrieve identity-scoped memories → generate with tool use → 
     mythify → sovereign halo validate → audit save)
THEN the response contains valid output AND an audit record exists AND
     tool calls are executed
```

**Risk level:** **HIGH** — The entire tool-use and multi-step task capability of the platform is gated on a provider that has never successfully connected. If Gemini's response format differs from what the parser expects, or if tool-use responses come back in an unexpected shape, the entire feature collapses.

**Why it matters:** Without Gemini working, the platform is limited to single-turn text generation with Ollama or canned Mock responses. The AgentBuilder, multi-step task execution, and tool-use features are all dead code. The "Agent Core Foundation" and "Agent Task Engine" phases cannot be validated.

---

## Spike 2: `mcp-null-path`

**What's unknown:** The MCP client (`api/src/services/mcp-client.ts`) connects to an external server via stdio transport at `MCP_SERVER_PATH`. This env var is never set. Bootstrap (`api/src/index.ts:168-173`) catches the failure and logs a warning, but the `AgentBuilder` (`api/src/services/agent-builder.ts:51-64`) also catches the failure and sets `this.tools = []`. Every subsequent call to `AgentBuilder.execute` or `AgentBuilder.executeTask` that checks `this.mcpClient.isHealthy()` returns false, falling back to standard reasoning with no tools. The MCP request/response parsing (`mcp-client.ts:157-193`) is completely untested against a real server — the JSON-RPC framing, line-delimited response handling, and crash-recovery logic have never been exercised.

**Given/When/Then:**
```text
GIVEN MCP_SERVER_PATH points to a valid MCP server binary
WHEN the AgentBuilder initializes and discovers tools
THEN tool discovery returns ≥1 tool AND executeTool returns real results
     AND tool execution traces appear in the API response
```

**Risk level:** **HIGH** — Tool-use is the distinguishing feature of the platform. Without MCP, there are no tools, no task execution, no multi-step planning. The entire `AgentBuilder` (414 lines), `MCPClient` (210 lines), and orchestration tool-loop in `Orchestrator.processWithTools` (131 lines) are speculative.

**Why it matters:** The MCP protocol parsing (`MCPClient.sendRequest` writes newline-delimited JSON, `handleResponse` parses it) is custom and fragile. If the real MCP server uses a different framing, the entire integration breaks. Also, the `discover` method call (`sendRequest("discover", {})`) — the method name "discover" is arbitrary; a real MCP server may expect different handshake semantics.

---

## Spike 3: `vector-search-real-performance`

**What's unknown:** `MemoryService.vectorSearch` (`api/src/services/memory-service.ts:77-108`) does a **client-side brute-force cosine similarity scan** — it loads ALL documents with embeddings via `collection.find({ embedding: { $exists: true } }).toArray()`, then iterates every document in JavaScript to compute similarity. There is no MongoDB Atlas Search index or `$vectorSearch` aggregation. With 100 documents this is fast. With 10,000 documents of 384-dimensional embeddings, this will load ~15MB into memory and do 10M+ float operations per query — all in the hot path of every `Orchestrator.process` call. The `embedQuery` method (`memory-service.ts:147-156`) delegates to the default provider's `embed` function — which with the Mock provider returns a deterministic hash-based embedding that has zero semantic meaning.

**Given/When/Then:**
```text
GIVEN the memory collection contains 10,000 documents with real embeddings
WHEN a vector search query executes through the full orchestrator pipeline
THEN the p99 search latency stays under 500ms AND results are semantically
     relevant (not hash-based noise)
```

**Risk level:** **HIGH** — If real embeddings are used (via Gemini or Ollama's nomic-embed-text), the current brute-force approach will not scale. The "hash embedding" fallback in `OllamaProvider.embed` (`ollama-provider.ts:116-120`) produces meaningless vectors — all similarity searches return random results. The system may appear to work with MockProvider but degrade catastrophically with real data.

**Why it matters:** Memory retrieval is the foundation of identity consistency. If vector search is either too slow (blocks generation) or returns garbage (wrong memories retrieved), identity-consistent output cannot be achieved. The performance requirement is "identity overhead ≤200ms" — the current implementation cannot meet this at any meaningful scale.

---

## Spike 4: `mythic-overhead-value`

**What's unknown:** The Sovereign Halo / Mythic Module stack adds 500+ lines of validation and transformation logic. Three concerns:

1. **Tone detection** (`sovereign-halo.ts:143-206`) uses a 7-word formal list (`["shall","hereby","furthermore","pursuant","notwithstanding","heretofore"]`) and a 7-word informal list (`["gonna","wanna","yeah","cool","awesome","lol","omg"]`) to classify output tone. This is trivially fooled — any sentence containing the word "shall" passes as formal.

2. **Symbolic drift** (`sovereign-halo.ts:212-273`) auto-passes (`driftScore=0`) when `requireSymbolicAnchors` is false — which is the default in most test configurations.

3. **Mythify transformations** (`mythic-module.ts:294-383`) are regex-based word substitutions (`"help" → "empower"`, `"great" → "awesome"`). These can produce incoherent output (e.g., "Use this tool to help solve problems" becomes "Invoke this tool to empower solve challenges").

**Given/When/Then:**
```text
GIVEN Sovereign Halo and Mythic Module are ENABLED
WHEN 100 diverse LLM outputs are validated and transformed
THEN the quality (coherence/appropriateness) is no worse than the raw
     LLM output AND the added latency stays under 200ms
```

**Risk level:** **MEDIUM** — The code won't crash, but the current implementation may actively degrade output quality while providing no real safety guarantee. The tone detection is a toy, the "profanity list" has 5 entries, and the symbolic anchor injection is cosmetic.

**Why it matters:** Phase 5 (Identity-Bound Reasoning), Phase 6 (Mythic Module), and Phase 7 (Sovereign Halo) are core to the Aetherium value proposition. If these layers add overhead without meaningful improvement, the product's differentiation evaporates. Worse, the regex transformations could introduce errors that are hard to debug — "I feel this is helpful" becomes "I state this is helpful" (authoritative mode), changing the meaning.

---

## Spike 5: `identity-cache-memory-leak`

**What's unknown:** `IdentityBindingService` (`api/src/services/identity-binding.ts:22-24`) uses an in-memory `Map<string, CacheEntry>` with a TTL of 60 seconds for found identities and 5 seconds for null results. There is **no eviction policy** — entries are never deleted after TTL expiry. Under sustained load with distinct identities, this cache grows unbounded. Each `CacheEntry` holds a `SigilIdentity` object (name, developerId, config, versions array). With 100,000 distinct identities over a day of operation, this could consume hundreds of MB of heap.

**Given/When/Then:**
```text
GIVEN the system serves requests for 10,000 distinct identity anchors
     over 1 hour
WHEN memory usage is measured
THEN heap growth attributable to IdentityBinding cache stabilizes below
     50MB (i.e., eviction is working) OR does not grow at all
```

**Risk level:** **MEDIUM** — Won't crash in testing (small number of identities), but in production with thousands of identities this is a silent memory leak. The TTL of 60 seconds for cached identities means each identity is re-fetched from MongoDB every minute even under continuous use. Combined with unbounded growth, this is both a performance drag and a stability risk.

**Why it matters:** Memory leaks in Node.js eventually cause OOM crashes. The cache was designed with TTL but not implemented with eviction. "Identity overhead ≤200ms" includes resolution time — a growing cache slows GC and increases lookup time.

---

## Spike 6: `audit-immutability-unverified`

**What's unknown:** `AuditService` (`api/src/services/audit-service.ts`) computes a SHA-256 hash over identityId, prompt, output, provenance fields (`generateHash`, line 134-147). This hash is **stored** alongside the record but is **never verified** — there is no `verify()` method, no read path that checks hash integrity, and no API endpoint that returns the hash for external verification. The "best-effort" `save` method (`audit-service.ts:47-77`) silently returns `null` on failure, and the orchestrator's `saveAuditRecord` (`orchestrator.ts:568`) wraps it in a try/catch that logs and swallows the error. This means:
- Audit records can be silently dropped (connection issue, write failure)
- Existing records can be tampered with and nobody notices
- The "immutability" property claimed in the architecture is aspirational

**Given/When/Then:**
```text
GIVEN a set of audit records exist in MongoDB
WHEN an attacker (or bug) modifies the output or prompt fields of a record
THEN a hash re-verification detects the tampering AND the API endpoint
     can surface the integrity failure
```

**Risk level:** **HIGH** — The audit trail is a core architectural promise ("Audit & Immutability" — Phase 8). If it doesn't actually detect tampering, the entire immutability story is fiction. The silent-failure path (`return null` on write error) means audit records can be lost without any alert.

**Why it matters:** Without verifiable immutability, the identity-bound generation history cannot be trusted. This breaks the fundamental value proposition of "identity-consistent outputs across sessions" — if you can't prove output history hasn't been altered, the identity system loses its evidentiary value.

---

## Spike 7: `concurrent-audit-integrity`

**What's unknown:** The entire request pipeline runs in Node.js's single event loop — concurrent requests are interleaved, not parallel. However, the audit save (`orchestrator.ts:568`) and memory upsert (`memory-service.ts:66`) are async MongoDB operations without transactions. Under concurrent load:
- Two requests for the same identity could interleave, causing audit records to reference the same version number incorrectly
- A memory upsert for one identity could be half-committed when another identity's read occurs
- The `IdentityService.updateIdentity` uses optimistic locking (`{ id, version: existing.version }`) but `createIdentity` does not

**Given/When/Then:**
```text
GIVEN 50 concurrent reasoning requests for 3 identities
WHEN all requests complete
THEN every audit record has correct identityId AND every memory document
     is scoped to the correct identity AND no records are lost (count
     matches requests)
```

**Risk level:** **MEDIUM** — The cross-identity leakage tests exist and pass with mock data. But they use deterministic mock providers (synchronous, immediate return). With real async providers (Gemini/Ollama API calls), the interleaving patterns change. The audit service has no transaction wrapping — if two requests for the same identity save audit records concurrently, there's no guarantee both persist.

**Why it matters:** Data integrity is the core promise. "No cross-identity memory leakage" and "identity data encrypted at rest" are stated constraints. If concurrent access breaks these guarantees under real load, the platform cannot be used for multi-tenant scenarios.

---

## Summary: Prioritization

| Spike | Risk | Value if Validated | Effort Estimate |
|-------|------|-------------------|-----------------|
| `gemini-full-path` | HIGH | Unlocks tool-use, task execution | 1-2 days (API key + config) |
| `mcp-null-path` | HIGH | Unlocks all tool capabilities | 2-4 days (mock MCP server) |
| `vector-search-real-performance` | HIGH | Validates scalability | 2-3 days (benchmark suite) |
| `audit-immutability-unverified` | HIGH | Establishes trust guarantee | 1 day (add verify endpoint) |
| `mythic-overhead-value` | MEDIUM | Validates core differentiator | 2-3 days (A/B test harness) |
| `concurrent-audit-integrity` | MEDIUM | Ensures data safety | 1-2 days (load test) |
| `identity-cache-memory-leak` | MEDIUM | Prevents production OOM | 0.5 day (add eviction) |

**Recommended first spike:** `gemini-full-path` — without it, every other spike runs against MockProvider and produces unrepresentative results.
