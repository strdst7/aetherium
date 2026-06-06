# Technology Stack

**Analysis Date:** 2026-06-06

## Languages

**Primary:**
- **TypeScript** 5.1.3 - Used throughout `web/` and `api/` packages
- **JavaScript** (Node.js runtime scripts) - Used in `tools/` (e.g., `sigil-validate.js`, `seed_memory.js`)
- **Python** 3 - Used in tooling scripts (`tools/seed_memory.py`)

**Secondary:**
- **JSON** - Design tokens and fixture data (`design/sigil/v1.json`, `tests/fixtures/halo_arc.json`)
- **SVG** - Sigil assets (`web/components/*.svg`)

## Runtime

**Environment:**
- **Node.js** 20 (base image `node:20-slim` in Dockerfiles)
- `api/Dockerfile`: `FROM node:20-slim`
- `web/Dockerfile`: `FROM node:20-slim`
- GitHub Actions also pins `node-version: 20`

**Package Manager:**
- **npm** - Used in both `web/` and `api/` packages
- Lockfile: `package-lock.json` present in both packages (lockfileVersion 3)

## Frameworks

**Core:**
- **Next.js** ^14.0.0 (`web/package.json`) - React framework for the web shell
- **React** ^18.2.0 (`web/package.json`) - UI library
- **Express** ^4.18.2 (`api/package.json`) - HTTP server for the reasoning API

**Testing:**
- **Jest** ^30.4.2 - Test runner for both web and API
- **ts-jest** ^29.4.11 - TypeScript preprocessor for Jest
- **@testing-library/react** ^16.3.2 - React component testing utilities
- **@testing-library/jest-dom** ^6.9.1 - Custom DOM matchers
- **supertest** ^7.2.2 - HTTP endpoint testing (API only)

**Build/Dev:**
- **TypeScript** ^5.1.3 - Transpiler for both packages
- **ts-node-dev** ^2.0.0 - Development auto-reload for API (`api/package.json`)

**Design / UI Documentation:**
- **Storybook** (`@storybook/nextjs`) - Component documentation and isolation
  - Config: `web/.storybook/main.ts`
  - Addons: `@storybook/addon-links`, `@storybook/addon-essentials`, `@storybook/addon-interactions`

## Key Dependencies

**Critical:**
- `mongodb` ^6.0.0 (`api/package.json`) - MongoDB native driver for memory persistence
- `umap-js` ^1.4.0 (`web/package.json`) - UMAP dimensionality reduction for memory visualization

**Infrastructure / Tooling:**
- `express` ^4.18.2 - API HTTP server
- `pymongo` (Python) - MongoDB driver for Python seed scripts
- `boto3` (Python, optional) - AWS S3 SDK for MinIO uploads in `tools/seed_memory.py`

**Development:**
- `@types/express`, `@types/jest`, `@types/node`, `@types/supertest`, `@types/react` - Type definitions

## Configuration

**Environment:**
- `.env.local` at repo root defines all environment variables
- Variables include: `MONGODB_URI`, `S3_*`, `REDIS_URL`, `API_PORT`, `WEB_PORT`, `NEXT_PUBLIC_API_URL`
- Docker Compose loads `.env.local` into containers (`infra/docker-compose.yml`)

**Build:**
- `web/tsconfig.json` - ES2020, ESNext module, JSX preserve, `noEmit: true`
- `api/tsconfig.json` - ES2020, CommonJS, `outDir: ./dist`, strict mode enabled
- `web/next.config.js` - React StrictMode, `NEXT_PUBLIC_API_URL` env mapping
- `web/jest.config.js` - jsdom environment, `@/` path alias mapped to `src/`
- `api/jest.config.js` - node environment, ts-jest default preset

## Platform Requirements

**Development:**
- Node.js 20
- npm (with lockfile v3)
- Docker & Docker Compose (for local infrastructure: MongoDB, MinIO, Redis)
- Optional: Python 3 + `pymongo` and `boto3` for seeding tools
- Optional: Ollama running locally (default `http://localhost:11434`) for live AI inference

**Production:**
- Docker containers (Node.js 20 slim base)
- MongoDB 6.0
- Redis 7
- MinIO (or AWS S3-compatible object store)
- Ollama instance (or fallback to mock provider)

---

*Stack analysis: 2026-06-06*
