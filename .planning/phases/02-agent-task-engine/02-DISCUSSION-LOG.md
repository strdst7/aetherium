# Phase 02: Agent Task Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-06
**Phase:** 02-agent-task-engine
**Areas discussed:** Task decomposition strategy, Action output format, Multi-step execution limits, MongoDB assistant challenge scope

---

## Task Decomposition Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Plan-then-execute | Generate structured plan before executing tools. Plan included in response. | ✓ |
| Reactive with extended context | Keep existing reactive loop with higher iteration limit. | |
| Hybrid (plan + fallback) | Start with plan, fall back to reactive if plan fails. | |

**User's choice:** Plan-then-execute
**Notes:** User wants the agent to show its work — the plan should be visible in the API response so the caller knows what steps were taken.

---

## Action Output Format

| Option | Description | Selected |
|--------|-------------|----------|
| Structured action types | New `actions` field with typed action objects (report, update, trigger). | ✓ |
| Text-only | Natural-language description of action. | |
| Both structured + text | Both actions array and natural-language summary. | |

**User's choice:** Structured action types
**Notes:** User wants action types to be machine-parseable — the caller might be a script, not a human.

---

## Multi-Step Execution Limits

| Option | Description | Selected |
|--------|-------------|----------|
| Separate task mode (20 iterations) | Detect if request is complex, use higher limit. | ✓ |
| Configurable per-request (default 10) | Caller sets limit. Simple, no detection logic. | |
| Unlimited with timeout (30s) | No iteration limit, time-based cap. | |

**User's choice:** Separate task mode (20 iterations)
**Notes:** User wants task mode to be automatic for complex requests, but the caller should be able to override it.

---

## MongoDB Assistant Challenge Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Query + data manipulation | Natural-language queries that also modify data. | ✓ |
| Schema exploration + reporting | Discover schema, query data, aggregate, generate reports. | |
| Both (full assistant) | Both query+manipulation and schema+reporting. | |

**User's choice:** Query + data manipulation
**Notes:** The primary demonstration scenario is: "Find all users who haven't logged in for 30 days and set their status to inactive."

---

## OpenCode's Discretion

The following details were delegated to OpenCode's judgment during planning/implementation:
- Exact plan JSON schema (step structure, validation rules)
- Detection heuristic for task mode vs tool mode (keywords list, regex)
- Retry logic for failed steps (exponential backoff, max retries)
- Action type mapping from tool calls to action types
- Demo data seeding script structure

## Deferred Ideas

Ideas mentioned during discussion but out of scope for Phase 2:
- Schema exploration + reporting (advanced MongoDB assistant features)
- Streaming task execution (real-time progress updates)
- Task persistence (save task state to resume later)
- Web UI for task visualization (showing plan steps)
- Identity-bound task execution (tasks that respect identity constraints)
- Audit trail for task execution (every step logged)

---

*Phase: 02-agent-task-engine*
*Discussion log generated: 2026-06-06*
