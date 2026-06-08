# Aetherium — Project Guide

## Overview

Aetherium is a sovereign, identity-first AI intelligence platform built on a brownfield TypeScript/Node.js/Next.js codebase. The v1 core is a functional agent powered by **Gemini + Google Cloud Agent Builder** that integrates a **MongoDB MCP server** to solve real-world challenges through multi-step tool use and action.

**Core value:** A developer registers an identity and reliably gets identity-consistent outputs from an LLM across sessions, tasks, and agents.

## Tech Stack

- **Runtime:** Node.js 20
- **API:** Express 4.x, TypeScript 5.1
- **Web:** Next.js 14, React 18, TypeScript
- **Database:** MongoDB 6 (memory + identity persistence), Redis 7
- **LLM:** Gemini via Google Cloud (Vertex AI / Google AI Studio)
- **Agent Framework:** Google Cloud Agent Builder
- **Testing:** Jest 30, ts-jest, supertest, @testing-library/react
- **Infrastructure:** Docker Compose (MongoDB, Redis, MinIO)

## Key Directories

```
api/src/
  adapters/       # AI provider adapters (Ollama, Mock, Gemini)
  agents/         # Multi-agent council (Archivist, SigilKeeper, Narrator)
  bootstrap/      # DI/provider registration
  controllers/    # Express route handlers
  services/       # Business logic (Orchestrator, MemoryService, ProviderRegistry, ReflectiveService)
web/
  pages/          # Next.js pages (index, agents, governance, memory)
  components/     # React components + Storybook stories
  src/            # Design tokens, utilities
design/sigil/     # Design system tokens (v1.json)
tools/            # Seed scripts, validation, standalone services
infra/            # Docker Compose
```

## Development Workflow

1. **Local setup:** `docker-compose -f infra/docker-compose.yml up` (MongoDB, Redis, MinIO)
2. **API dev:** `cd api && npm run dev` (ts-node-dev on port 8080)
3. **Web dev:** `cd web && npm run dev` (Next.js on port 3000)
4. **Tests:** `npm test` in either `api/` or `web/`

## Deployment

### Docker (Local)
- Compose file in `infra/docker-compose.yml` — run from project root: `docker compose -f infra/docker-compose.yml up`
- `env_file: ../.env.local` resolves to root `.env.local`
- MongoDB 7 + Redis 7-alpine with health checks; services wait for healthy deps
- API on `:8080`, Web on `:3000`, MinIO on `:9000` / `:9001`

### Vercel (Web Frontend)
- Deploy `web/` directory as Next.js app (Root Directory: `web`)
- `vercel.json` at project root sets `rootDirectory: "web"` and `framework: "nextjs"`
- Set `NEXT_PUBLIC_API_URL` env var in Vercel dashboard to deployed API URL

### Google Cloud Run (API Backend)
- Deploy `api/` container to Cloud Run
- Visit the root URL in browser — serves a landing page (`GET /`)
- Health check: `GET /health`
- Frontend (Next.js) deploys separately to Vercel

## Architecture Mapping

| Existing Component | Aetherium Role | Status |
|--------------------|----------------|--------|
| `Orchestrator` | Crystal Core | Extend (add identity hooks) |
| `MultiAgentOrchestrator` | Fusion Orchestrator | Extend (add identity coherence) |
| `ReflectiveService` | Ascendant Framework + Sovereign Halo | Extend (add rule engine) |
| MongoDB memory layer | Void Foundation | Keep |
| Next.js web shell | Sigil Gate UI | Extend |
| `ProviderRegistry` | Provider resilience layer | Keep |

## GSD Workflow

This project uses the Get Shit Done (GSD) workflow:

- **Mode:** yolo (auto-approve plans, execute directly)
- **Granularity:** fine (11 phases)
- **Current phase:** 12 (ready to plan Phase 1-11 execution, Phase 12 complete)
- **Planning docs:** `.planning/` directory

### Key Commands

- `/gsd-discuss-phase N` — Gather context before planning Phase N
- `/gsd-plan-phase N` — Create executable plan for Phase N
- `/gsd-execute-phase N` — Execute Phase N plans
- `/gsd-execute-phase N` — Execute Phase N plans
- `/gsd-verify-work` — Verify deliverables against requirements

### Phase Order

1. Agent Core Foundation (Gemini + Agent Builder + MCP)
2. Agent Task Engine (multi-step tasks, action)
3. Agent Interface & Contracts (API, structured responses)
4. Identity Registration & Persistence
5. Identity-Bound Reasoning
6. Mythic Module
7. Sovereign Halo
8. Audit & Immutability
9. Web UI Extensions
10. End-to-End Integration & Testing
11. Performance Hardening & Documentation
12. MIII-AIM Brand Melody Injection (design tokens, header, mythic presets)

## Critical Constraints

- **Backward compatibility:** Existing API contracts must not break (additive changes only)
- **Performance:** Identity overhead ≤200ms; p99 generation latency <5s
- **Security:** Identity data encrypted at rest
- **No cross-identity memory leakage:** Memory retrieval must be strictly identity-scoped

## Environment

Environment variables in `.env.local`:
- `MONGODB_URI`, `S3_*`, `REDIS_URL`, `API_PORT`, `WEB_PORT`, `NEXT_PUBLIC_API_URL`
- Gemini / Google Cloud credentials (to be added for v1)

## Testing

- Co-located tests: `*.test.ts` next to source files
- Jest configs: `api/jest.config.js` (node env), `web/jest.config.js` (jsdom env)
- Shared fixtures: `tests/fixtures/`

## Design System

- Source of truth: `design/sigil/v1.json`
- Visual language: crystalline geometry, ritualized interfaces
- Web tokens: `web/src/tokens.ts`
