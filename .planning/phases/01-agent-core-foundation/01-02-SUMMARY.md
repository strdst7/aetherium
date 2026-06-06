# Plan 01-02: MCP Client + AgentBuilder — Summary

**Executed:** 2026-06-06
**Status:** Complete

## What Was Built

Created the MCP client that connects to the MongoDB MCP server via stdio transport, auto-discovers tools, and executes tool calls. Created the AgentBuilder service that wraps the existing Orchestrator and manages the tool registration and session lifecycle.

## Key Changes

### Files Created
- `api/src/services/mcp-client.ts` — MCP client with stdio transport, auto-discovery, tool execution, and server lifecycle management
- `api/src/services/agent-builder.ts` — AgentBuilder that wraps Orchestrator and manages tool registration

### Files Modified
- `api/src/controllers/reason.ts` — Extended ReasonResponse with tool fields, updated ReasonController to accept AgentBuilder
- `api/src/services/orchestrator.ts` — Added `processWithTools` method for tool-use generation
- `api/src/index.ts` — Wired up MCP client and AgentBuilder in bootstrap, added graceful shutdown

## Decisions Implemented

- **D-06:** Agent Builder wraps the existing `Orchestrator` (delegates memory, prompt, reflection)
- **D-08:** MCP server connects as standalone process via stdio transport
- **D-09:** Agent-managed lifecycle: starts server on startup, monitors it, restarts if crashes
- **D-10:** MCP server path via `MCP_SERVER_PATH` env var
- **D-11:** Tools auto-discovered from MCP server at startup and registered into Agent Builder
- **D-12:** If MCP server unavailable or tool call fails, return structured error in `ReasonResponse` with `toolExecutionTrace`

## Test Results

```
PASS src/services/provider-registry.test.ts
PASS src/bootstrap/providers.test.ts
PASS src/adapters/gemini-provider.test.ts

Test Suites: 6 passed, 6 total
Tests:       46 passed, 46 total
```

Build: `npm run build` — passed (no TypeScript errors)

## Self-Check: PASSED

- [x] MCPClient file exists with `discoverTools`, `executeTool`, `start`, `stop`, `isHealthy`
- [x] MCPClient uses stdio transport with newline-delimited JSON
- [x] MCPClient handles server crashes and restarts with exponential backoff
- [x] AgentBuilder file exists with `initialize`, `execute`, `shutdown`
- [x] AgentBuilder wraps Orchestrator and integrates MCPClient
- [x] Tool execution trace is recorded for each step
- [x] MCP server failures produce structured errors
- [x] Application builds successfully
- [x] Existing routes remain unchanged

## Issues Encountered

None.

## Next Steps

Plan 01-03 (Orchestrator Integration + API Contracts) can proceed — this plan provides the MCP client and AgentBuilder that will be integrated into the full pipeline.
