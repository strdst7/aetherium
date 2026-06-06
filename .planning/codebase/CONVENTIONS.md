# Coding Conventions

**Analysis Date:** 2026-06-06

## Naming Patterns

**Files:**
- Source files use **kebab-case**: `memory-service.ts`, `ollama-provider.ts`, `provider-registry.test.ts`
- Next.js pages use kebab-case or descriptive names: `index.tsx`, `agents.tsx`, `memory.tsx`, `governance.tsx`

**Functions:**
- Regular functions use **camelCase**: `createMemoryRouter()`, `registerProviders()`, `orchestrateReasoning()`
- Factory functions follow camelCase: `createMemoryRouter()`, `createReasonRouter()`, `createMultiAgentRouter()`

**Variables:**
- Local variables use **camelCase**: `memoryService`, `queryEmbedding`, `reflectiveResult`
- Module-level mutable state uses **SCREAMING_SNAKE_CASE**: `FORCE_FAIL` in `api/src/adapters/ollama-provider.ts` and `api/src/adapters/mock-provider.ts`
- API payload fields use **snake_case**: `identity_anchor`, `maxTokens` (mixed — some snake, some camel)

**Types & Classes:**
- Classes use **PascalCase**: `Orchestrator`, `MemoryService`, `ProviderRegistry`, `ReflectiveService`
- Interfaces use **PascalCase**: `AIProvider`, `GenerateRequest`, `GenerateResponse`, `AgentContext`
- Type aliases use **PascalCase**: `ProviderEntry`, `AgentResponse`, `ReasoningTrace`

**Enum-like literals:**
- String union types use lowercase with hyphens/underscores: `"approved" | "refine" | "reject"`

## Code Style

**Formatting:**
- No Prettier, ESLint, or Biome configuration detected in the repository
- Indentation: 2 spaces (observed across all files)
- Quote style: **inconsistent** — some files use double quotes (`api/src/index.ts`, `api/src/services/memory-service.ts`), others use single quotes (`api/src/services/orchestrator.ts`, `web/src/index.test.tsx`)
- Semicolons: Used consistently

**TypeScript Configuration:**
- API (`api/tsconfig.json`): `strict: true`, CommonJS modules, targets ES2020
- Web (`web/tsconfig.json`): `strict: false`, ESNext modules, JSX preserved
- API generates declarations and source maps; web uses `noEmit: true`

## Import Organization

**Order:**
No strict import grouping is enforced. Observed patterns:
1. External dependencies (e.g., `express`, `mongodb`, `react`)
2. Internal absolute/relative imports (e.g., `../services/memory-service`)
3. JSON imports (e.g., `../../design/sigil/v1.json`)

**Path Aliases:**
- Web package uses `@/` alias mapped to `<rootDir>/src/$1` in `web/jest.config.js`
- No path aliases observed in API package

**Quote Consistency Issues:**
- API adapters and services predominantly use double quotes
- API controllers and web files mix single and double quotes
- When contributing code, match the quote style of the surrounding file

## Error Handling

**Primary Pattern:**
All code uses the same `instanceof Error` guard pattern:
```typescript
const message = error instanceof Error ? error.message : "Internal server error";
```

**Locations:**
- `api/src/index.ts:76`
- `api/src/controllers/memory.ts:12`
- `api/src/controllers/multi-agent.ts:16`
- `api/src/controllers/reason.ts:222`
- `api/src/adapters/ollama-provider.ts:63`

**Validation Strategy:**
Input validation in `ReasonController.validateRequest()` uses explicit `Error` throws with descriptive messages:
```typescript
if (!req.identity_anchor || typeof req.identity_anchor !== "string") {
  throw new Error("identity_anchor is required and must be a string");
}
```

**Service Layer Guards:**
Database-dependent methods in `MemoryService` guard against uninitialized state:
```typescript
if (!this.collection) {
  throw new Error("Memory service not connected");
}
```

## Logging

**Framework:** `console` (no structured logging library detected)

**Patterns:**
- Bootstrap logs use emoji prefixes: `✅`, `⚠️`, `🚀`, `❌`
- Warning logs use `console.warn()` with emoji: `⚠️ Ollama embeddings unavailable...`
- `api/src/index.ts` contains extensive bootstrap logging
- No log levels or structured format (JSON) are used

## Comments

**When to Comment:**
- JSDoc/TSDoc comments used sparingly for public API surface:
  - `ProviderRegistry.register()` — explains priority ordering
  - `ProviderRegistry.pick()` — explains health check fallback behavior
  - `ReflectiveService.evaluate()` — notes upgraded logic specification

**File Headers:**
- `web/src/tokens.ts` includes an auto-generated warning: `Automatically generated - do not edit directly`

## Function Design

**Size:**
- Functions tend to be moderately sized (20–60 lines)
- `Orchestrator.process()` is a long function (~80 lines) handling multiple sequential steps
- Controllers are thin wrappers delegating to services

**Parameters:**
- Prefer destructuring in function signatures: `process(req: OrchestratorRequest)`
- Options objects used for optional parameters: `{ maxTokens?: number; temperature?: number }`
- Default values set inline: `alpha: number = 0.7`, `k: number = 5`

**Return Values:**
- Async methods return `Promise<T>` explicitly
- Service methods return domain types (`Promise<VectorSearchResult[]>`)
- Controllers return Express `Response` objects via `res.json()` / `res.status()`

## Module Design

**Exports:**
- Named exports are preferred: `export class MemoryService`, `export interface AIProvider`
- Default exports used only for Next.js pages: `export default function Home()`
- Utility functions exported alongside classes: `export function createMemoryRouter()`

**Barrel Files:**
- No barrel files (`index.ts` re-exports) detected
- Each module imports directly from its source file

**State Management:**
- `ProviderRegistry` uses singleton pattern via `static get instance()`
- Module-level `FORCE_FAIL` flags in adapters for test simulation
- No global state store (Redux, Zustand, etc.) in web package

## React / Frontend Conventions

**Component Style:**
- Functional components with hooks
- Inline styles using `React.CSSProperties` objects (no CSS modules or styled-components)
- `useState`, `useEffect`, `useRef` used standardly
- Type annotations on state: `useState<ReasoningResponse | null>(null)`

**Storybook:**
- Stories use CSF (Component Story Format) with default export for metadata
- Stories located alongside components: `components/Button.stories.tsx`

---

*Convention analysis: 2026-06-06*
