# Codebase Structure

**Analysis Date:** 2026-06-06

## Directory Layout

```
aetherium/
├── .github/            # GitHub Actions workflows and templates
├── .planning/          # GSD planning documents (codebase maps, milestones)
│   └── codebase/
├── api/                # Backend API (Node.js, Express, TypeScript)
│   ├── src/
│   │   ├── adapters/      # AI provider adapters
│   │   ├── agents/          # Multi-agent council implementations
│   │   ├── bootstrap/       # DI/bootstrap logic
│   │   ├── controllers/     # HTTP route handlers
│   │   ├── services/        # Business logic and orchestration
│   │   ├── index.ts         # API entry point
│   │   └── run_demo.ts      # Standalone demo script
│   ├── jest.config.js
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── web/                # Frontend web application (Next.js, React, TypeScript)
│   ├── components/       # React components and Storybook stories
│   ├── pages/            # Next.js pages (index, agents, governance, memory)
│   ├── src/
│   │   ├── tokens.ts       # Design token utilities
│   │   └── index.test.tsx  # Smoke test
│   ├── jest.config.js
│   ├── jest.setup.js
│   ├── next.config.js
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── infra/              # Docker Compose infrastructure
│   └── docker-compose.yml
├── design/             # Design system tokens and assets
│   └── sigil/
│       └── v1.json
├── tools/              # CLI utilities and standalone services
│   ├── seed_memory.js       # MongoDB memory seeding
│   ├── seed_memory.py       # Python alternative seeder
│   ├── sigil-keeper-service.ts  # Standalone validation HTTP service
│   └── sigil-validate.js    # CI SVG validation script
├── tests/              # Shared test fixtures
│   └── fixtures/
│       └── halo_arc.json
├── docs/               # Project documentation
│   ├── demo-script.md
│   └── runbook.md
├── venv/               # Python virtual environment
└── (root config files)
    ├── .gitignore
    ├── .env.local
    └── compliance_report.json
```

## Directory Purposes

**`api/src/adapters/`:**
- Purpose: Abstract external AI providers behind a common interface
- Contains: Adapter interface and provider implementations
- Key files: `api/src/adapters/ai-adapter.ts`, `api/src/adapters/ollama-provider.ts`, `api/src/adapters/mock-provider.ts`

**`api/src/agents/`:**
- Purpose: Specialized reasoning agents for the multi-agent council
- Contains: Agent implementations and shared types
- Key files: `api/src/agents/archivist.ts`, `api/src/agents/sigil-keeper.ts`, `api/src/agents/narrator.ts`, `api/src/agents/types.ts`

**`api/src/bootstrap/`:**
- Purpose: Application initialization and dependency registration
- Contains: Provider registration logic
- Key files: `api/src/bootstrap/providers.ts`

**`api/src/controllers/`:**
- Purpose: HTTP layer — request parsing, validation, and response formatting
- Contains: Express router factories and controllers
- Key files: `api/src/controllers/reason.ts`, `api/src/controllers/memory.ts`, `api/src/controllers/multi-agent.ts`, `api/src/controllers/failover.ts`

**`api/src/services/`:**
- Purpose: Core business logic — orchestration, memory, provider registry, reflection
- Contains: Service classes and their unit tests
- Key files: `api/src/services/orchestrator.ts`, `api/src/services/memory-service.ts`, `api/src/services/provider-registry.ts`, `api/src/services/reflective-service.ts`, `api/src/services/multi-agent-orchestrator.ts`

**`web/pages/`:**
- Purpose: Next.js pages (file-based routing)
- Contains: Page components for each route
- Key files: `web/pages/index.tsx`, `web/pages/agents.tsx`, `web/pages/memory.tsx`, `web/pages/governance.tsx`

**`web/components/`:**
- Purpose: Reusable React components and design assets
- Contains: Components, Storybook stories, SVG assets
- Key files: `web/components/Button.tsx`, `web/components/Button.stories.tsx`

**`design/sigil/`:**
- Purpose: Source of truth for design tokens and compliance rules
- Contains: JSON design token definitions
- Key files: `design/sigil/v1.json`

**`tools/`:**
- Purpose: Standalone utilities for seeding, validation, and compliance
- Contains: Node.js and Python scripts, plus a standalone Express service
- Key files: `tools/seed_memory.js`, `tools/sigil-validate.js`, `tools/sigil-keeper-service.ts`

**`tests/fixtures/`:**
- Purpose: Shared test data
- Contains: JSON fixture files
- Key files: `tests/fixtures/halo_arc.json`

**`infra/`:**
- Purpose: Local infrastructure orchestration
- Contains: Docker Compose configuration
- Key files: `infra/docker-compose.yml`

## Key File Locations

**Entry Points:**
- `api/src/index.ts`: Express API server bootstrap and route registration
- `web/pages/index.tsx`: Next.js default home page (reasoning shell)

**Configuration:**
- `api/tsconfig.json`: API TypeScript config (CommonJS, strict, dist output)
- `web/tsconfig.json`: Web TypeScript config (ESNext, jsx preserve, noEmit)
- `web/next.config.js`: Next.js config with `NEXT_PUBLIC_API_URL` env
- `api/jest.config.js`: Jest config for Node.js test environment
- `web/jest.config.js`: Jest config for jsdom test environment with `@/` alias
- `infra/docker-compose.yml`: Multi-service compose (MongoDB, Redis, MinIO, API, Web)

**Core Logic:**
- `api/src/services/orchestrator.ts`: Main reasoning orchestration flow
- `api/src/services/reflective-service.ts`: Identity compliance validation
- `api/src/services/memory-service.ts`: MongoDB memory persistence and vector search
- `api/src/services/provider-registry.ts`: AI provider registry with failover

**Testing:**
- `api/src/services/*.test.ts`: Co-located service unit tests
- `api/src/controllers/*.test.ts`: Co-located controller tests
- `web/src/index.test.tsx`: Frontend smoke test
- `tests/fixtures/halo_arc.json`: Shared fixture data

## Naming Conventions

**Files:**
- TypeScript source: kebab-case (`memory-service.ts`, `multi-agent-orchestrator.ts`)
- Tests: same name as source with `.test.ts` suffix (`memory-service.test.ts`)
- React components: PascalCase (`Button.tsx`, `agents.tsx` for pages)

**Directories:**
- Lowercase, kebab-case (`multi-agent-orchestrator.ts`)
- No barrel files detected in agent or adapter directories

**Types/Interfaces:**
- PascalCase (`MemoryDocument`, `VectorSearchResult`, `AgentContext`)
- Services and controllers use PascalCase class names

## Where to Add New Code

**New API Endpoint:**
- Primary code: `api/src/controllers/<feature>.ts`
- Service logic: `api/src/services/<feature>.ts`
- Tests: `api/src/controllers/<feature>.test.ts` and `api/src/services/<feature>.test.ts`
- Wire route: `api/src/index.ts`

**New Agent:**
- Implementation: `api/src/agents/<agent-name>.ts`
- Update orchestrator: `api/src/services/multi-agent-orchestrator.ts`
- Import types: `api/src/agents/types.ts`

**New AI Provider Adapter:**
- Implementation: `api/src/adapters/<provider>-provider.ts`
- Register: `api/src/bootstrap/providers.ts`
- Must implement `AIProvider` interface from `api/src/adapters/ai-adapter.ts`

**New Web Page:**
- Implementation: `web/pages/<page-name>.tsx`
- Link from existing pages or navigation

**New Shared Component:**
- Implementation: `web/components/<ComponentName>.tsx`
- Story (optional): `web/components/<ComponentName>.stories.tsx`

**Design Token Updates:**
- Source: `design/sigil/v1.json`
- Regenerate utilities: `web/src/tokens.ts` (manually updated, not automated)

## Special Directories

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No (listed in `.gitignore`)

**`api/dist/`:**
- Purpose: Compiled TypeScript output for API
- Generated: Yes (`npm run build`)
- Committed: No (listed in `.gitignore`)

**`venv/`:**
- Purpose: Python virtual environment
- Generated: Yes
- Committed: No (listed in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies (exists in both `api/` and `web/`)
- Generated: Yes
- Committed: No (listed in `.gitignore`)

---

*Structure analysis: 2026-06-06*
