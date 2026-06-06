# External Integrations

**Analysis Date:** 2026-06-06

## APIs & External Services

**AI / LLM Inference:**
- **Ollama** - Local LLM inference server
  - SDK/Client: Native `fetch` (no npm SDK); HTTP calls to `/api/generate` and `/api/embed`
  - Implementation: `api/src/adapters/ollama-provider.ts`
  - Default URL: `http://localhost:11434` (override via `OLLAMA_URL` env var)
  - Capabilities: text generation, embeddings (with local hash-based fallback)
  - Health check: `GET /api/tags`

- **Mock Provider** (fallback)
  - Implementation: `api/src/adapters/mock-provider.ts`
  - Used when Ollama is unavailable; generates keyword-based canned responses

**Provider Failover:**
- `ProviderRegistry` (`api/src/services/provider-registry.ts`) manages priority-based failover between Ollama (priority 1) and Mock (priority 2)
- Simulation endpoint: `GET /api/forceFail` toggles forced failure for testing (`api/src/controllers/failover.ts`)

## Data Storage

**Databases:**
- **MongoDB** 6.0
  - Connection: `MONGODB_URI` env var (default `mongodb://localhost:27017/aetherium`)
  - Client: `mongodb` native driver v6 (`api/src/services/memory-service.ts`)
  - Collections: `memory` (stores documents with content, embeddings, metadata, sigil)
  - Indexes: `{ id: 1 }`, `{ sigil: 1 }`
  - Vector search: implemented in-memory via cosine similarity (no vector DB extension)

**File Storage:**
- **MinIO** (S3-compatible object storage)
  - Connection: `S3_ENDPOINT` env var (default `http://minio:9000`)
  - Client: `boto3` (Python) in `tools/seed_memory.py`
  - Auth: `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`
  - Bucket: `S3_BUCKET` (default `aetherium-blobs`)
  - Usage: Uploading seed fixture files as S3 objects with metadata (`sigil_anchor`, `uploaded_at`)

**Caching:**
- **Redis** 7
  - Declared in `infra/docker-compose.yml` (`redis:7` image, port 6379)
  - Environment var `REDIS_URL` present in `.env.local`
  - **Not actively used** in application source code (no Redis client imports found)
  - Reserved for future caching/session use

## Authentication & Identity

**Auth Provider:**
- **None detected**
- API has open CORS (`Access-Control-Allow-Origin: *`) with no authorization middleware
- No auth libraries ( Passport, JWT, OAuth, etc.) present in `package.json`

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Rollbar, etc.)

**Logs:**
- Console logging (`console.log`, `console.warn`, `console.error`) used throughout bootstrap and adapters
- No structured logging framework (Winston, Pino, etc.)

## CI/CD & Deployment

**Hosting:**
- Local Docker Compose stack (`infra/docker-compose.yml`)
- Services: `minio`, `mongo`, `redis`, `api`, `web`

**CI Pipeline:**
- **GitHub Actions**
  - Workflow: `.github/workflows/identity.yml`
  - Trigger: PRs affecting `web/components/**`, `design/sigil/**`, `design/tokens/**`, `tools/sigil-validate.js`
  - Steps: checkout, setup Node 20, run `node tools/sigil-validate.js web/components`

## Environment Configuration

**Required env vars:**
| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://mongo:27017/aetherium` |
| `S3_ENDPOINT` | MinIO / S3 endpoint | `http://minio:9000` |
| `S3_ACCESS_KEY` | S3 access key | `minio` |
| `S3_SECRET_KEY` | S3 secret key | `minio123` |
| `S3_REGION` | S3 region | `us-east-1` |
| `S3_BUCKET` | S3 bucket name | `aetherium-blobs` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` |
| `API_PORT` | API server port | `8080` |
| `API_HOST` | API server host | `0.0.0.0` |
| `WEB_PORT` | Web dev server port | `3000` |
| `NEXT_PUBLIC_API_URL` | Public API URL for web client | `http://api:8080` |
| `OLLAMA_URL` | Ollama base URL | `http://localhost:11434` |

**Secrets location:**
- `.env.local` at repository root (should be `.gitignore`d; currently present and tracked)
- Docker Compose references `.env.local` via `env_file` directive

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected (no outgoing webhooks, no event subscriptions)

## Design System Integration

**Sigil Design Tokens:**
- Source: `design/sigil/v1.json`
- Consumed by: `web/src/tokens.ts` (generates CSS variables and JS exports)
- Compliance validation: `tools/sigil-validate.js` enforces geometry and color rules on SVG components

---

*Integration audit: 2026-06-06*
