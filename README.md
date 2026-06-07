# Aetherium 
**Sovereign, Identity-First AI Intelligence Platform**  

![](https://img.shields.io/badge/Gemini-magenta)
![](https://img.shields.io/badge/GoogleCloudAgentBuilder-yellow)
![MongoDB!](https://img.shields.io/badge/MCPServer-MongoDB-red)
[![License: ISC](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-production_ready-brightgreen)


<img width="1536" height="1024" alt="BCO 226e545e-e25b-41ca-9e74-9006f9962a2a" src="https://github.com/user-attachments/assets/040ea809-fd30-4806-8f2d-777c0e1599bd" />



Aetherium enables developers to register an identity and reliably get **identity-consistent outputs** from an LLM across sessions, tasks, and agents. The platform enforces identity constraints at every reasoning step, validates outputs against identity law, and maintains a complete audit trail — ensuring that AI-generated content always aligns with a registered identity's tone, voice, and values.

## Architecture

- **Gemini + Google Cloud Agent Builder** — LLM reasoning with multi-step tool use
- **MongoDB MCP Server** — Real-world data integration via Model Context Protocol
- **Identity Binding** — SigilIdentity-driven constraint engine enforcing tone, voice, and symbolic anchors
- **Sovereign Halo** — Output validation layer with forbidden behavior detection and automatic regeneration
- **Audit Trail** — Append-only, SHA-256-hashed audit records for every generation
- **Next.js Web Shell** — Identity management, reasoning traces, memory inspection, and validation reports

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 |
| API | Express 4.x, TypeScript 5.1 |
| Web | Next.js 14, React 18, TypeScript |
| Database | MongoDB 6, Redis 7 |
| LLM | Gemini via Google Cloud (Vertex AI / Google AI Studio) |
| Agent Framework | Google Cloud Agent Builder |
| Testing | Jest 30, ts-jest, supertest, @testing-library/react |
| Infrastructure | Docker Compose (MongoDB, Redis, MinIO) |

## Quickstart

```bash
# Clone and install
git clone <repository-url> && cd aetherium
npm install

# Start infrastructure
docker-compose -f infra/docker-compose.yml up mongo redis minio -d

# Start API (terminal 1)
cd api && npm run dev

# Start Web (terminal 2)
cd web && npm run dev
```

Open `http://localhost:3000` to access the web shell. The API is available at `http://localhost:8080`.

Verify the API is healthy:

```bash
curl http://localhost:8080/health
```

## Documentation

| Document | Description |
|----------|-------------|
| [API Integration Guide](docs/API_INTEGRATION.md) | Complete guide with curl and JavaScript examples for all API endpoints |
| [Deployment Guide](docs/DEPLOYMENT.md) | Local Docker Compose setup and cloud deployment options |
| [Demo Runbook](docs/runbook.md) | Step-by-step demo walkthrough |
| [OpenAPI Specification](api/openapi.yml) | Machine-readable API specification |

## Project Structure

```
api/src/
  adapters/       # AI provider adapters (Ollama, Mock, Gemini)
  agents/         # Multi-agent council (Archivist, SigilKeeper, Narrator)
  bootstrap/      # DI/provider registration
  controllers/    # Express route handlers
  services/       # Business logic (Orchestrator, MemoryService, ProviderRegistry)
web/
  pages/          # Next.js pages (identity, memory, agents)
  components/     # React components (IdentityForm, ReasoningTrace, ValidationReport)
  src/            # Design tokens, utilities, API client
design/sigil/     # Design system tokens (v1.json)
tools/            # Seed scripts, validation, standalone services
infra/            # Docker Compose configuration
docs/             # API integration guide, deployment guide, runbook
```

## Testing

```bash
# Run all tests
npm run test:all

# Run API tests only
npm run test:api

# Run web tests only
npm run test:web

# Run end-to-end tests
npm run test:e2e
```

Tests are co-located with source files (`*.test.ts`). Performance tests are in `api/src/tests/performance/`.

## Contributing

1. All changes must include tests (co-located `*.test.ts` files)
2. Run `npm run test:all` before committing
3. Follow existing TypeScript conventions (strict mode)
4. API changes must be backward-compatible (additive only)
5. Update OpenAPI spec (`api/openapi.yml`) for any new endpoints



 ![](https://img.shields.io/badge/Miii&C.U-orange)
