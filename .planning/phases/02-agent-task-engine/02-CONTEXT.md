# Phase 02: Agent Task Engine - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable the agent to decompose user requests into planned steps, execute multi-step tool workflows, and produce actionable output (reports, updates, triggers). The agent already has basic tool-use from Phase 1 (GeminiProvider, MCPClient, AgentBuilder with 5-iteration tool loop). Phase 2 adds multi-step planning, structured action types, and the real-world MongoDB assistant challenge.

**What's in scope:**
- Task decomposition (planning before execution)
- Multi-step execution with higher iteration limits
- Structured action types in responses
- MongoDB assistant: query + data manipulation

**What's out of scope:**
- Identity binding (Phase 4)
- Web UI changes (Phase 9)
- API versioning (Phase 3)
- Streaming responses (Phase 11 / v2)

</domain>

<decisions>
## Implementation Decisions

### Task Decomposition Strategy
- **D-19:** Plan-then-execute approach. The agent generates a structured plan before executing any tools. The plan is a JSON array of steps, each with `tool`, `args`, and `expected_result`.
- **D-20:** The plan is included in the `ReasonResponse` under a new `plan` field. The caller can see the planned steps before execution begins.
- **D-21:** If a step fails, the agent retries once with adjusted parameters. If the retry fails, the agent skips the step and continues with the remaining steps. The final response includes a `planStatus` indicating whether the plan completed fully, partially, or failed.

### Action Output Format
- **D-22:** The `ReasonResponse` includes a new `actions` field (array of structured action objects). Action types: `report` (data aggregation), `update` (record modification), `trigger` (workflow/event), `notify` (message/alert).
- **D-23:** Each action object contains: `type`, `title`, `data`, and `format`. The `output` field continues to contain the human-readable summary.
- **D-24:** The agent determines the action type based on the tool calls made. For example, a `query` tool that returns aggregated data produces a `report` action. An `update` tool produces an `update` action.

### Multi-Step Execution Limits
- **D-25:** Separate "task mode" with `maxTaskIterations: 20` (vs `maxToolIterations: 5` for simple queries). The agent detects whether the user request requires a plan (multi-step) or a single tool call.
- **D-26:** Simple detection heuristic: if the user request contains keywords like "and then", "after that", or "first...then", the agent uses task mode. Otherwise, it uses the existing tool mode (5 iterations).
- **D-27:** The caller can override the mode by setting `options.mode: 'tool' | 'task'` in the `ReasonRequest`. If not specified, the agent auto-detects.

### MongoDB Assistant Challenge
- **D-28:** The primary demonstration scenario is query + data manipulation. Example: "Find all users who haven't logged in for 30 days and set their status to inactive."
- **D-29:** The agent must handle the full pipeline: (1) plan generation (query → update), (2) tool execution (find users, update status), (3) action synthesis (report: "Updated 42 users to inactive").
- **D-30:** Test data is seeded into MongoDB via a script in `tools/seed-demo-data.ts` for demonstration purposes.

### OpenCode's Discretion
- Exact plan JSON schema (step structure, validation rules)
- Detection heuristic for task mode vs tool mode (keywords list, regex)
- Retry logic for failed steps (exponential backoff, max retries)
- Action type mapping from tool calls to action types
- Demo data seeding script structure

</decisions>

<specifics>
## Specific Ideas

- "I want the agent to show its work — the plan should be visible in the API response so the caller knows what steps were taken."
- "Action types should be machine-parseable — the caller might be a script, not a human."
- "Task mode should be automatic for complex requests, but the caller should be able to override it."
- "The MongoDB assistant should handle real-world scenarios: not just queries, but data manipulation too."

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 Foundation
- `api/src/services/agent-builder.ts` — AgentBuilder with tool execution loop (max 5 iterations)
- `api/src/services/orchestrator.ts` — Orchestrator with `processWithTools` for tool-use generation
- `api/src/services/mcp-client.ts` — MCPClient with stdio transport and auto-discovery
- `api/src/controllers/reason.ts` — ReasonResponse with `toolCalls`, `toolResults`, `toolExecutionTrace`
- `.planning/phases/01-agent-core-foundation/01-CONTEXT.md` — Phase 1 decisions (tool-use, provider failover, MCP lifecycle)

### Phase 2 Scope
- `.planning/PROJECT.md` — Project vision, v1 proof point (intelligent MongoDB assistant)
- `.planning/REQUIREMENTS.md` — Requirements AG-04, AG-05, AG-06
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, and phase boundary

### Existing Patterns
- `api/src/adapters/ai-adapter.ts` — AIProvider interface with `generateWithTools`
- `api/src/services/provider-registry.ts` — Provider selection with `requireToolUse`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AgentBuilder` (`api/src/services/agent-builder.ts`) — Add plan generation and task mode execution. The existing `execute` method handles tool-mode reasoning; extend it with a `executeTask` method for plan-then-execute.
- `Orchestrator` (`api/src/services/orchestrator.ts`) — Add `generatePlan` method that uses `generateWithTools` to produce a structured plan. The existing `processWithTools` handles the actual tool execution.
- `MCPClient` (`api/src/services/mcp-client.ts`) — No changes needed; it already provides tool execution. The AgentBuilder will call it multiple times in sequence during task execution.
- `ReasonResponse` (`api/src/controllers/reason.ts`) — Add `plan`, `actions`, and `planStatus` fields. Fully backward-compatible (optional fields).
- `MockAgentBuilder` (`api/src/services/mock-agent-builder.ts`) — Extend to simulate plan generation and task execution for tests.
- `MockMCPServer` (`api/src/services/mock-mcp-server.ts`) — Add `update` tool to simulate data manipulation for the MongoDB assistant challenge.

### Established Patterns
- Controller pattern: `ReasonController` wraps `Orchestrator` and `AgentBuilder`
- Express middleware factory: `createReasonRouter` creates route handler from controller
- Bootstrap pattern: `registerProviders()` initializes providers at startup
- Co-located tests: `*.test.ts` next to source files
- Mock pattern: `MockAgentBuilder` and `MockMCPServer` for unit tests

### Integration Points
- `api/src/services/agent-builder.ts` — Add `executeTask` method with plan generation and step execution
- `api/src/services/orchestrator.ts` — Add `generatePlan` method for structured plan generation
- `api/src/controllers/reason.ts` — Extend `ReasonResponse` with `plan`, `actions`, `planStatus`
- `api/src/controllers/reason.ts` — Add `options.mode` to `ReasonRequest` for task/tool mode selection
- `api/src/index.ts` — Wire up `executeTask` in the reason endpoint
- `tools/seed-demo-data.ts` — Create demo data for MongoDB assistant testing

</code_context>

<deferred>
## Deferred Ideas

- Schema exploration + reporting (advanced MongoDB assistant features) — could be added later as an enhancement
- Streaming task execution (real-time progress updates) — v2 advanced reasoning
- Task persistence (save task state to resume later) — future phase
- Web UI for task visualization (showing plan steps) — Phase 9
- Identity-bound task execution (tasks that respect identity constraints) — Phase 5
- Audit trail for task execution (every step logged) — Phase 8

</deferred>

---

*Phase: 02-agent-task-engine*
*Context gathered: 2026-06-06*
