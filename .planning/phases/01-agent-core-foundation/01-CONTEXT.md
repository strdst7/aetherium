# Phase 01: Agent Core Foundation - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect the existing reasoning pipeline to Gemini + Google Cloud Agent Builder + MongoDB MCP server, and execute basic tool calls (schema discovery, query execution). The existing provider system (Ollama, Mock) and orchestration layer must remain intact. No identity binding, multi-step tasks, or UI changes — those belong in later phases.

</domain>

<decisions>
## Implementation Decisions

### Gemini Provider Integration
- **D-01:** Extend `AIProvider` interface with `generateWithTools(req: GenerateRequest, tools: ToolDefinition[]): Promise<GenerateResponse>` and `capabilities.supportsToolUse: boolean`. GeminiProvider implements both standard generation and tool-use.
- **D-02:** `generateWithTools` returns `toolCalls` in `GenerateResponse`. The caller (Orchestrator) is responsible for executing the tools and calling `generateWithTools` again with the results. This gives the Orchestrator full control over the tool loop.
- **D-03:** GeminiProvider registers into the existing `ProviderRegistry` with priority 0 (highest). Falls back to Ollama (priority 1), then Mock (priority 2). Tool-use is only available when Gemini is healthy.
- **D-04:** Gemini credentials provided via `GEMINI_API_KEY` environment variable (Google AI Studio).
- **D-05:** Model selection is configurable via `GEMINI_MODEL` environment variable, defaulting to `gemini-1.5-pro`.

### Agent Builder vs. Existing Orchestrator
- **D-06:** Agent Builder wraps the existing `Orchestrator`. Agent Builder handles the outer session, tool registration, and Gemini connection. When a reasoning request comes in, Agent Builder delegates the actual loop (memory retrieval, prompt building, reflection) to the existing `Orchestrator`.
- **D-07:** The multi-agent council (Archivist → SigilKeeper → Narrator) still runs through `MultiAgentOrchestrator` as-is. No changes to the council pipeline in Phase 1.

### MCP Server Integration
- **D-08:** MCP server connects as a standalone process via stdio transport. The agent spawns the server as a child process.
- **D-09:** Agent-managed lifecycle: the agent starts the MCP server on startup and monitors it. If the server crashes, the agent restarts it.
- **D-10:** MCP server executable path provided via `MCP_SERVER_PATH` environment variable.
- **D-11:** Tools are auto-discovered from the MCP server at startup and registered into Agent Builder automatically. No manual mapping file.
- **D-12:** If the MCP server is unavailable or a tool call fails, the agent returns a structured error in `ReasonResponse` with `toolExecutionTrace` showing the failure. No fallback to non-tool reasoning path.

### API Contract for Tool Responses
- **D-13:** Extend the existing `ReasonResponse` with new optional fields: `toolCalls` (array of tool calls made), `toolResults` (array of execution results), and `toolExecutionTrace` (steps of the tool-use loop).
- **D-14:** The existing `POST /reason` endpoint handles both plain reasoning and tool-based reasoning. When no tools are used, these fields are absent/null. When tools are used, they are populated.
- **D-15:** Changes are fully backward-compatible — existing clients ignore unknown fields.

### Testing Strategy
- **D-16:** Create a `MockAgentBuilder` that simulates the entire Agent Builder framework (tool registration, session management, reasoning loop) for unit tests.
- **D-17:** Create a `MockMCPServer` — a small Node.js script that implements the MCP stdio protocol and exposes a few fake tools (e.g., `echo`, `add`). The test suite spawns it as a real child process to test the actual stdio transport.
- **D-18:** Separate `*.integration.test.ts` suite runs against real Gemini API when `GEMINI_API_KEY` is present. Skipped in CI if no key.

### OpenCode's Discretion
- Exact error message format for MCP server unavailability
- Exact retry logic for MCP server restart (exponential backoff details)
- MockAgentBuilder implementation details (what fake tools to expose)
- MockMCPServer fake tool set (echo, add, etc.)
- Integration test organization (folder structure, naming convention)

</decisions>

<specifics>
## Specific Ideas

- "I want the existing provider system to stay intact — Ollama and Mock should still work exactly as they do now."
- "The multi-agent council should not change in Phase 1 — it's part of the identity layer, not the agent core."
- "Tool-use should be explicit in the API response — if tools are used, the caller should see exactly what was called and what returned."
- "MCP server should be partner-provided, so we shouldn't hardcode its internals. Auto-discovery is the right approach."

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Provider System
- `api/src/adapters/ai-adapter.ts` — `AIProvider` interface and `GenerateRequest`/`GenerateResponse` types
- `api/src/services/provider-registry.ts` — `ProviderRegistry` with priority-based failover and health checks
- `api/src/bootstrap/providers.ts` — Provider registration pattern (Ollama + Mock)

### Orchestration
- `api/src/services/orchestrator.ts` — Existing `Orchestrator` with memory retrieval, prompt building, reflection
- `api/src/services/multi-agent-orchestrator.ts` — Multi-agent council pipeline (Archivist → SigilKeeper → Narrator)
- `api/src/services/memory-service.ts` — MongoDB memory persistence and vector search
- `api/src/services/reflective-service.ts` — Reflective evaluation layer

### API Contracts
- `api/src/controllers/reason.ts` — Existing `POST /reason` endpoint, `ReasonRequest`, `ReasonResponse`

### Project Requirements
- `.planning/PROJECT.md` — Project vision, key decisions (Gemini + Agent Builder, MCP server, extend Orchestrator)
- `.planning/REQUIREMENTS.md` — Requirements AG-01, AG-02, AG-03
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and phase boundary

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AIProvider` interface (`api/src/adapters/ai-adapter.ts`) — Extend with `generateWithTools` and `supportsToolUse`
- `ProviderRegistry` (`api/src/services/provider-registry.ts`) — Register GeminiProvider with priority 0; existing failover logic stays
- `Orchestrator` (`api/src/services/orchestrator.ts`) — Agent Builder delegates to this for memory, prompt, reflection
- `MultiAgentOrchestrator` (`api/src/services/multi-agent-orchestrator.ts`) — Keep unchanged for Phase 1
- `ReasonController` (`api/src/controllers/reason.ts`) — Extend `ReasonResponse` with tool fields
- `MockProvider` (`api/src/adapters/mock-provider.ts`) — Pattern for creating `MockGeminiProvider` or `MockAgentBuilder`

### Established Patterns
- Singleton provider registry with priority-based failover
- Controller pattern: `ReasonController` wraps `Orchestrator` and `ReflectiveService`
- Express middleware factory: `createReasonRouter` creates route handler from controller
- Bootstrap pattern: `registerProviders()` initializes providers at startup
- Co-located tests: `*.test.ts` next to source files

### Integration Points
- `api/src/index.ts` — Express app initialization; add GeminiProvider registration and MCP server startup here
- `api/src/bootstrap/providers.ts` — Add GeminiProvider registration alongside Ollama and Mock
- `api/src/controllers/reason.ts` — Extend `ReasonResponse` to include tool fields
- `api/src/services/orchestrator.ts` — Add tool-use loop delegation from Agent Builder

</code_context>

<deferred>
## Deferred Ideas

- Multi-step task decomposition and planning (Phase 2)
- Real-world action beyond basic tool calls (Phase 2)
- Natural-language API and structured response contracts (Phase 3)
- Identity registration and binding (Phase 4)
- Identity-bound reasoning and memory scoping (Phase 5)
- Mythic Module and tone shaping (Phase 6)
- Sovereign Halo validation layer (Phase 7)
- Audit and immutability (Phase 8)
- Web UI for identity management and testing (Phase 9)
- Streaming responses for real-time generation (Phase 11 / v2)
- Mobile native app (v2)
- Enterprise RBAC / multi-tenant isolation (v2)

</deferred>

---

*Phase: 01-agent-core-foundation*
*Context gathered: 2026-06-06*
