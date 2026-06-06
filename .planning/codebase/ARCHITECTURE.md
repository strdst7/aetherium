# Architecture

**Analysis Date:** 2026-06-06

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      Web Client (Next.js)                    │
│              `web/pages/index.tsx`                           │
├──────────────────┬──────────────────┬───────────────────────┤
│   Web Shell      │   Agents UI      │    Memory Viz         │
│  `web/pages/`    │  `web/pages/`    │   `web/pages/`        │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Server (Express)                      │
│         `api/src/index.ts`                                   │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Controllers ──► Services ──► Adapters ──► External APIs     │
│  `api/src/controllers/`                                      │
│  `api/src/services/`                                         │
│  `api/src/adapters/`                                         │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Data Stores                                               │
│  MongoDB (Memory) / Redis / MinIO (S3)                    │
│  `infra/docker-compose.yml`                                │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| ReasonController | Handles `/v1/reason` endpoint, validates requests, orchestrates reasoning flow, reflective checks | `api/src/controllers/reason.ts` |
| MemoryController | Exposes memory retrieval and trace endpoints | `api/src/controllers/memory.ts` |
| FailoverController | Simulates provider failures for testing | `api/src/controllers/failover.ts` |
| Orchestrator | Core reasoning engine: embeds queries, retrieves memories, generates candidates, triggers reflection | `api/src/services/orchestrator.ts` |
| MultiAgentOrchestrator | Coordinates Archivist → SigilKeeper → Narrator pipeline | `api/src/services/multi-agent-orchestrator.ts` |
| MemoryService | MongoDB persistence, vector search with cosine similarity, CRUD operations | `api/src/services/memory-service.ts` |
| ProviderRegistry | Singleton registry for AI providers with priority-based selection and health checks | `api/src/services/provider-registry.ts` |
| ReflectiveService | Identity compliance validation: sigil geometry and identity contradiction rules | `api/src/services/reflective-service.ts` |
| Archivist | Agent that retrieves and summarizes identity-anchored memories | `api/src/agents/archivist.ts` |
| SigilKeeper | Agent that enforces Sigil law and identity fidelity | `api/src/agents/sigil-keeper.ts` |
| Narrator | Agent that produces final user-facing answers | `api/src/agents/narrator.ts` |
| AIProvider | Adapter interface for LLM providers (generate, embed, healthCheck) | `api/src/adapters/ai-adapter.ts` |

## Pattern Overview

**Overall:** Layered architecture with Adapter and Singleton patterns, plus a multi-agent pipeline.

**Key Characteristics:**
- Express backend with clear separation of controllers, services, and adapters
- Next.js frontend using Pages Router
- Provider Registry implements priority-based failover with health checks
- Reflective validation layer acts as a governance gate between generation and response
- Multi-agent council pattern for complex reasoning tasks
- Design tokens drive UI consistency and compliance validation

## Layers

**Presentation Layer (Web):**
- Purpose: User interface for reasoning queries, agent visualization, memory mapping, and governance docs
- Location: `web/pages/`
- Contains: Next.js pages with inline styles, React components, Storybook stories
- Depends on: API server via HTTP fetch
- Used by: Browser clients

**API Layer (Controllers):**
- Purpose: HTTP request handling, JSON serialization, basic validation
- Location: `api/src/controllers/`
- Contains: Express route handlers and router factories
- Depends on: Service layer
- Used by: Web frontend, external clients

**Service Layer:**
- Purpose: Business logic, reasoning orchestration, memory operations, provider selection
- Location: `api/src/services/`
- Contains: Orchestrator classes, registry, reflective validation
- Depends on: Adapters, MongoDB
- Used by: Controllers

**Agent Layer:**
- Purpose: Specialized reasoning actors following the Agent interface
- Location: `api/src/agents/`
- Contains: Archivist, SigilKeeper, Narrator implementations
- Depends on: Services (MemoryService, ReflectiveService, ProviderRegistry)
- Used by: MultiAgentOrchestrator

**Adapter Layer:**
- Purpose: Abstract external AI providers (Ollama, Mock)
- Location: `api/src/adapters/`
- Contains: AIProvider interface, OllamaProvider, MockProvider
- Depends on: External HTTP APIs
- Used by: Services (Orchestrator, ProviderRegistry)

**Data Layer:**
- Purpose: Persistent storage for memory documents
- Location: MongoDB (configured via `MONGODB_URI`)
- Contains: Memory collection with embeddings and metadata
- Accessed by: MemoryService

## Data Flow

### Primary Request Path (Single-Agent Reasoning)

1. **Entry** — Client POSTs to `/v1/reason` (`api/src/index.ts:71`)
2. **Validation** — `ReasonController.handleReason()` validates input (`api/src/controllers/reason.ts:49`)
3. **Orchestration** — `Orchestrator.process()` embeds query, retrieves memories, generates candidate (`api/src/services/orchestrator.ts:43`)
4. **Provider Selection** — `ProviderRegistry.pick()` selects highest-priority healthy provider (`api/src/services/provider-registry.ts:42`)
5. **Reflection** — `ReflectiveService.check()` evaluates candidate against identity rules (`api/src/services/reflective-service.ts:57`)
6. **Refinement (optional)** — If status is "refine", re-generates with constraints injected (`api/src/services/orchestrator.ts:86`)
7. **Response** — `ReasonController` assembles response with trace, context, and optional refined candidate (`api/src/controllers/reason.ts:134`)

### Multi-Agent Council Path

1. **Entry** — Client POSTs to `/v1/multi-agent` (`api/src/controllers/multi-agent.ts:7`)
2. **Archivist** — `Archivist.act()` retrieves memories (`api/src/agents/archivist.ts:13`)
3. **Sigil Keeper** — `SigilKeeper.act()` checks intent against rules (`api/src/agents/sigil-keeper.ts:13`)
4. **Narrator** — `Narrator.act()` synthesizes final answer under constraints (`api/src/agents/narrator.ts:8`)
5. **Response** — Returns structured agent outputs (`api/src/controllers/multi-agent.ts:14`)

### Memory Trace Path

1. **Entry** — Client GETs `/v1/memory/trace?query=...` (`api/src/controllers/memory.ts:16`)
2. **Embedding** — `MemoryService.embedQuery()` generates embedding via default provider (`api/src/services/memory-service.ts:128`)
3. **Search** — `MemoryService.vectorSearch()` performs cosine similarity search (`api/src/services/memory-service.ts:72`)
4. **Response** — Returns embedding vector and ranked results (`api/src/controllers/memory.ts:24`)

**State Management:**
- API state is maintained in-memory via the `ProviderRegistry` singleton and instantiated service classes
- MongoDB holds persistent memory documents
- Frontend uses React `useState` only; no global state library detected

## Key Abstractions

**AIProvider:**
- Purpose: Unified interface for LLM providers enabling swapability
- Examples: `api/src/adapters/ollama-provider.ts`, `api/src/adapters/mock-provider.ts`
- Pattern: Adapter pattern

**Agent:**
- Purpose: Contract for specialized reasoning actors in the multi-agent pipeline
- Examples: `api/src/agents/archivist.ts`, `api/src/agents/narrator.ts`
- Pattern: Strategy pattern

**ProviderRegistry:**
- Purpose: Decouples provider selection from orchestration logic; enables failover and capability filtering
- Examples: `api/src/services/provider-registry.ts`
- Pattern: Singleton + Registry pattern

**ReflectiveService:**
- Purpose: Governance gate that enforces identity rules before responses reach users
- Examples: `api/src/services/reflective-service.ts`
- Pattern: Decorator / Gatekeeper pattern

## Entry Points

**API Server:**
- Location: `api/src/index.ts`
- Triggers: `npm run start` (node dist/index.js) or `npm run dev` (ts-node-dev)
- Responsibilities: Bootstraps MongoDB connection, registers AI providers, initializes services, mounts Express routes, starts HTTP server on port 8080

**Web Application:**
- Location: `web/pages/index.tsx` (Next.js default page)
- Triggers: `npm run dev` (Next.js dev server) or `npm run start`
- Responsibilities: Renders reasoning shell UI, communicates with API server

**Sigil Keeper Service (Standalone):**
- Location: `tools/sigil-keeper-service.ts`
- Triggers: Direct execution (not currently wired into docker-compose)
- Responsibilities: HTTP service for SVG/CSS validation against design tokens on port 7000

**Seed Memory Tool:**
- Location: `tools/seed_memory.js`
- Triggers: CLI execution (`node tools/seed_memory.js --file <fixture>`)
- Responsibilities: Upserts memory documents into MongoDB from JSON fixtures

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop. No worker threads detected.
- **Global state:** `ProviderRegistry` is a module-level singleton (`api/src/services/provider-registry.ts`). `ProviderRegistryInstance` is exported as a shared reference.
- **Circular imports:** None detected, but `MemoryService` depends on `ProviderRegistryInstance` for embeddings, creating a cross-layer coupling.
- **Provider coupling:** `MemoryService.embedQuery()` directly accesses `ProviderRegistryInstance.defaultProvider`, making it dependent on registry initialization order.
- **Hardcoded thresholds:** Similarity alpha (0.7), memoryK (5), and identity_score thresholds (0.9) are hardcoded in multiple files.

## Anti-Patterns

### Inconsistent ReflectiveService Instantiation

**What happens:** `Orchestrator` instantiates its own `ReflectiveService` in the constructor (`api/src/services/orchestrator.ts:40`), while `ReasonController` receives a separate instance via dependency injection (`api/src/controllers/reason.ts:44`).
**Why it's wrong:** This creates two independent instances with potentially divergent state or configuration if the class ever holds state.
**Do this instead:** Pass `ReflectiveService` into `Orchestrator` via constructor injection, consistent with how `MemoryService` and `ProviderRegistry` are handled.

### Module-Level Singleton Export

**What happens:** `ProviderRegistryInstance` is exported as `ProviderRegistry.instance` at module load time (`api/src/services/provider-registry.ts:87`).
**Why it's wrong:** Side-effect on import makes testing and parallel execution harder; consumer cannot easily substitute a mock registry.
**Do this instead:** Export a factory function `createProviderRegistry()` or accept registry as an explicit parameter in service constructors.

### Frontend Hardcodes API URL

**What happens:** Frontend pages hardcode `http://localhost:8080` in fetch calls (`web/pages/agents.tsx:15`, `web/pages/memory.tsx:26`).
**Why it's wrong:** Breaks in production or containerized environments; Next.js `env` config exists but is not consistently used.
**Do this instead:** Use `process.env.NEXT_PUBLIC_API_URL` everywhere (as done in `web/pages/index.tsx:42` and `web/next.config.js`).

## Error Handling

**Strategy:** Controller-level try/catch with generic 400/500 JSON error responses.

**Patterns:**
- Controllers wrap service calls in try/catch and return `{ error: message }` with 400/500 status codes
- `Orchestrator` throws on missing providers or generation failures, letting the controller handle HTTP response mapping
- `ReflectiveService.evaluate()` returns structured result objects instead of throwing
- Frontend displays error messages in UI sections (`web/pages/index.tsx:157`)

## Cross-Cutting Concerns

**Logging:** Console-based logging only (`console.log`/`console.error`); no structured logging framework detected.
**Validation:** Manual validation in `ReasonController.validateRequest()` (`api/src/controllers/reason.ts:176`); no schema validation library (e.g., Zod, Joi) detected.
**Authentication:** No authentication or authorization middleware detected; CORS is configured permissively (`*` origin) (`api/src/index.ts:21`).
**Design Compliance:** `ReflectiveService` enforces identity rules at runtime; `tools/sigil-validate.js` enforces them at build/CI time.

---

*Architecture analysis: 2026-06-06*
