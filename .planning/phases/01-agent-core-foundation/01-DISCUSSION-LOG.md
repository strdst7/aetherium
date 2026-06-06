# Phase 01: Agent Core Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-06
**Phase:** 01-agent-core-foundation
**Areas discussed:** Gemini provider integration, Agent Builder vs. existing Orchestrator, MCP server integration model, API contract for tool responses, Testing strategy

---

## Gemini Provider Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Extend AIProvider with tool-use methods | Add `generateWithTools` and `supportsToolUse` to existing interface. GeminiProvider fits into existing ProviderRegistry. | ✓ |
| Create a separate GeminiAgentBuilder abstraction | Outside the ProviderRegistry. Isolates the new framework but means two provider systems coexist. | |
| Add a separate ToolProvider interface | Keep AIProvider unchanged. Add ToolProvider for Gemini. Orchestrator branches based on request type. | |

**User's choice:** Extend AIProvider with tool-use methods
**Notes:** User wants the existing provider system to stay intact — Ollama and Mock should still work exactly as they do now.

### Follow-up: Tool-use interface

| Option | Description | Selected |
|--------|-------------|----------|
| Orchestrator controls tool loop | `generateWithTools` returns `toolCalls`. Orchestrator executes tools and calls again. | ✓ |
| Provider handles tool loop internally | `executeWithTools` handles the entire loop internally. Less flexible for orchestrator. | |

**User's choice:** Orchestrator controls tool loop

### Follow-up: Failover

| Option | Description | Selected |
|--------|-------------|----------|
| Gemini priority 0, standard failover | Falls back to Ollama → Mock. Tool-use only available with Gemini. | ✓ |
| Gemini as separate tool-enabled category | No fallback for tool-use requests. Clear error if Gemini unavailable. | |

**User's choice:** Gemini priority 0, standard failover

### Follow-up: Credentials & Model

| Option | Description | Selected |
|--------|-------------|----------|
| API key + Configurable model | `GEMINI_API_KEY` env var. Model from `GEMINI_MODEL` env var, default `gemini-1.5-pro`. | ✓ |
| Service account + Configurable model | `GOOGLE_APPLICATION_CREDENTIALS`. Model from `GEMINI_MODEL`. | |
| Both (auto-detect) + Configurable model | Auto-detect API key or service account. | |

**User's choice:** API key + Configurable model

---

## Agent Builder vs. Existing Orchestrator

| Option | Description | Selected |
|--------|-------------|----------|
| Agent Builder wraps existing Orchestrator | Delegates memory, prompt, reflection to existing Orchestrator. Multi-agent council preserved. | ✓ |
| Agent Builder replaces existing Orchestrator for Gemini | Agent Builder handles full reasoning loop. Existing Orchestrator only for Ollama/Mock. | |
| Agent Builder as parallel layer | New endpoints use Agent Builder, existing `/reason` unchanged. Two separate reasoning paths. | |

**User's choice:** Agent Builder wraps existing Orchestrator
**Notes:** User wants the multi-agent council to not change in Phase 1 — it's part of the identity layer, not the agent core.

---

## MCP Server Integration Model

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone process (stdio transport) | Standard MCP pattern. Agent spawns server as child process. Auto-discover tools. | ✓ |
| In-process library | Import as Node.js module. Manual tool mapping. Simpler but tightly coupled. | |
| External service (SSE transport) | Server runs independently. Agent connects via SSE. More ops overhead. | |

**User's choice:** Standalone process (stdio transport)

### Follow-up: Lifecycle & Configuration

| Option | Description | Selected |
|--------|-------------|----------|
| Agent-managed + Env var | Agent starts server as child process. Path from `MCP_SERVER_PATH` env var. | ✓ |
| Agent-managed + Config file | Agent starts server. Path from `mcp-servers.json` config file. | |
| External + Env var | Server started externally. Agent connects via env var. | |
| External + Config file | Server started externally. Agent connects via config file. | |

**User's choice:** Agent-managed + Env var

### Follow-up: Error Handling & Tool Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Structured error + Auto-discovery | Surface tool failures explicitly. Auto-register MCP tools at startup. | ✓ |
| Structured error + Manual mapping | Surface tool failures. Manual mapping file. | |
| Fallback + Auto-discovery | Fallback to non-tool generation if MCP unavailable. | |
| Fallback + Manual mapping | Fallback to non-tool generation. Manual mapping. | |

**User's choice:** Structured error + Auto-discovery

---

## API Contract for Tool Responses

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing ReasonResponse | Add optional `toolCalls`, `toolResults`, `toolExecutionTrace`. Existing `/reason` handles both. | ✓ |
| Create new `/agent/execute` endpoint | Separate endpoint for tool execution. Cleaner but more API surface area. | |
| Unified `/reason` with mode flag | Add `mode` parameter to existing endpoint. Introduces mode switch. | |

**User's choice:** Extend existing ReasonResponse
**Notes:** User wants tool-use to be explicit in the API response — if tools are used, the caller should see exactly what was called and what returned.

---

## Testing Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| MockAgentBuilder + MockMCPServer + Integration tests | Mock entire Agent Builder framework. Mock MCP server as real child process. Integration tests against real Gemini. | ✓ |
| MockGeminiProvider + MockMCPServer + No real API tests | Mock provider implements AIProvider. Mock MCP server. All tests use mocks. | |
| Mock SDK + Mock transport + No real API tests | Mock Google SDK with Jest. Mock MCP transport. No real API tests. | |
| Mock SDK + Mock transport + Integration tests | Mock SDK + mock transport for unit tests. Integration tests against real Gemini. | |

**User's choice:** MockAgentBuilder + MockMCPServer + Integration tests

---

## OpenCode's Discretion

The following details were delegated to OpenCode's judgment during planning/implementation:
- Exact error message format for MCP server unavailability
- Exact retry logic for MCP server restart (exponential backoff details)
- MockAgentBuilder implementation details (what fake tools to expose)
- MockMCPServer fake tool set (echo, add, etc.)
- Integration test organization (folder structure, naming convention)

## Deferred Ideas

Ideas mentioned during discussion but out of scope for Phase 1:
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

---

*Phase: 01-agent-core-foundation*
*Discussion log generated: 2026-06-06*
