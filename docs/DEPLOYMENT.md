# Aetherium Deployment Guide

This guide covers local development setup, Docker Compose full-stack deployment, and cloud deployment options for the Aetherium platform.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Runtime for API and Web |
| npm | 9+ | Package manager (workspaces) |
| Docker | 24+ | Container runtime |
| Docker Compose | v2+ | Multi-service orchestration |
| MongoDB | 6+ (or use Docker) | Identity and memory persistence |
| Redis | 7+ (or use Docker) | Caching layer |

---

## Local Development Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd aetherium
```

### Step 2: Create Environment File

Create `.env.local` in the project root with the following variables:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/aetherium
REDIS_URL=redis://localhost:6379

# API Server
API_PORT=8080

# Web Server
WEB_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:8080

# LLM Provider (required for production use)
GEMINI_API_KEY=your_gemini_api_key_here

# MCP Server (optional, for MongoDB tool integration)
MCP_SERVER_PATH=/path/to/mcp-server
```

See the [Environment Configuration Reference](#environment-configuration-reference) for a complete list of variables.

### Step 3: Install Dependencies

```bash
npm install
```

This installs dependencies for both `api/` and `web/` via npm workspaces.

### Step 4: Start Infrastructure Services

Start MongoDB, Redis, and MinIO (S3-compatible object storage) via Docker:

```bash
docker-compose -f infra/docker-compose.yml up mongo redis minio -d
```

Verify services are running:

```bash
docker-compose -f infra/docker-compose.yml ps
```

### Step 5: Seed Data (Optional)

For demo or development data:

```bash
npx ts-node tools/seed-demo-data.ts
```

### Step 6: Start the API Server

```bash
cd api && npm run dev
```

The API server starts on `http://localhost:8080` with hot-reload via ts-node-dev.

### Step 7: Start the Web Server

In a separate terminal:

```bash
cd web && npm run dev
```

The web shell starts on `http://localhost:3000`.

### Step 8: Verify

```bash
curl http://localhost:8080/health
```

Expected response:

```json
{ "status": "ok", "timestamp": "2026-06-06T12:00:00.000Z" }
```

Open `http://localhost:3000` in your browser to access the web shell.

---

## Docker Compose Full Stack

Run the entire stack (infrastructure + API + Web) with a single command:

```bash
docker-compose -f infra/docker-compose.yml up --build
```

### Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `mongo` | `mongo:6.0` | 27017 | MongoDB database for identity and memory persistence |
| `redis` | `redis:7` | 6379 | Redis cache layer |
| `minio` | `minio/minio:latest` | 9000 (API), 9001 (Console) | S3-compatible object storage |
| `api` | Built from `api/Dockerfile` | 8080 | Aetherium reasoning API |
| `web` | Built from `web/Dockerfile` | 3000 | Next.js web shell |

### Stopping Services

```bash
docker-compose -f infra/docker-compose.yml down
```

To remove volumes (deletes all data):

```bash
docker-compose -f infra/docker-compose.yml down -v
```

---

## Cloud Deployment Options

### Option A: Google Cloud Run

**Architecture:** Containerized API + Web on Cloud Run, MongoDB Atlas for database, Memorystore for Redis.

| Component | Service | Notes |
|-----------|---------|-------|
| API | Cloud Run | Containerize with `api/Dockerfile`, set `MONGODB_URI` and `REDIS_URL` to managed services |
| Web | Cloud Run | Containerize with `web/Dockerfile`, set `NEXT_PUBLIC_API_URL` to API Cloud Run URL |
| Database | MongoDB Atlas (M10+) | Free tier available for testing; use VPC peering for production |
| Cache | Memorystore for Redis | In-memory data store with high availability |
| Object Storage | Cloud Storage | Replace MinIO with GCS buckets |

**Environment variable differences:**
- `MONGODB_URI` → Atlas connection string (e.g., `mongodb+srv://...`)
- `REDIS_URL` → Memorystore endpoint (e.g., `redis://10.x.x.x:6379`)
- `NEXT_PUBLIC_API_URL` → Public Cloud Run URL

**Scaling:** Cloud Run scales to zero when idle; configure minimum instances for production. Set `max-concurrent-requests` and `timeout` appropriately.

### Option B: AWS

**Architecture:** ECS/Fargate for API + Web, DocumentDB or MongoDB Atlas, ElastiCache for Redis.

| Component | Service | Notes |
|-----------|---------|-------|
| API | ECS Fargate | Task definition using `api/Dockerfile`, ALB for load balancing |
| Web | ECS Fargate | Task definition using `web/Dockerfile`, served behind ALB |
| Database | DocumentDB or MongoDB Atlas | DocumentDB for native AWS; Atlas for MongoDB compatibility |
| Cache | ElastiCache for Redis | Managed Redis with cluster mode |
| Object Storage | S3 | Replace MinIO with S3 buckets |

**Environment variable differences:**
- `MONGODB_URI` → DocumentDB/Atlas connection string
- `REDIS_URL` → ElastiCache endpoint
- `NEXT_PUBLIC_API_URL` → ALB DNS name

**Scaling:** Use ECS auto-scaling policies based on CPU/memory. Fargate handles node management automatically.

### Option C: Self-Managed VPS

**Architecture:** Docker Compose on a single VM (e.g., DigitalOcean, Linode, Hetzner).

| Component | Service | Notes |
|-----------|---------|-------|
| All services | Docker Compose on VM | Use the same `infra/docker-compose.yml` |

**Steps:**

1. Provision a VM (4+ vCPU, 8GB+ RAM recommended)
2. Install Docker and Docker Compose
3. Clone the repository and configure `.env.local`
4. Run `docker-compose -f infra/docker-compose.yml up --build -d`
5. Configure a reverse proxy (nginx/Caddy) for TLS termination
6. Set up DNS and firewall rules

**Scaling:** Vertical scaling (larger VM) for initial loads; split services to multiple VMs for horizontal scaling.

---

## Environment Configuration Reference

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `MONGODB_URI` | Yes | — | MongoDB connection string | `mongodb://localhost:27017/aetherium` |
| `REDIS_URL` | Yes | — | Redis connection string | `redis://localhost:6379` |
| `API_PORT` | No | `8080` | API server port | `8080` |
| `WEB_PORT` | No | `3000` | Web server port | `3000` |
| `NEXT_PUBLIC_API_URL` | Yes | — | API base URL for web client | `http://localhost:8080` |
| `GEMINI_API_KEY` | No* | — | Google Gemini API key for LLM provider | `AIza...` |
| `MCP_SERVER_PATH` | No | — | Path to MongoDB MCP server binary | `/usr/local/bin/mcp-server` |
| `MINIO_ROOT_USER` | No | `minio` | MinIO access key | `minio` |
| `MINIO_ROOT_PASSWORD` | No | `minio123` | MinIO secret key | `minio123` |
| `S3_ENDPOINT` | No | — | S3-compatible endpoint URL | `http://localhost:9000` |
| `S3_BUCKET` | No | — | S3 bucket name | `aetherium-data` |
| `S3_ACCESS_KEY` | No | — | S3 access key | `minio` |
| `S3_SECRET_KEY` | No | — | S3 secret key | `minio123` |

*`GEMINI_API_KEY` is required for production LLM inference. The mock provider is used for testing without a real key.

---

## Health Checks & Monitoring

### Health Endpoint

```bash
GET /health
```

Returns the health status of all subsystems:

```json
{
  "status": "ok",
  "timestamp": "2026-06-06T12:00:00.000Z",
  "checks": {
    "database": "ok",
    "llm": "ok",
    "mcp": "ok"
  }
}
```

**Status values:** `"ok"`, `"degraded"`, `"down"`

### API Info Endpoint

```bash
GET /v1/info
```

Returns API version and available capabilities.

### Log Inspection

- **API logs:** stdout/stderr from the API container (use `docker-compose logs api`)
- **Web logs:** stdout/stderr from the web container (use `docker-compose logs web`)
- **MongoDB logs:** `docker-compose logs mongo`
- **Redis logs:** `docker-compose logs redis`

---

## Troubleshooting

### MongoDB Connection Failures

**Symptom:** API starts but `/health` shows `"database": "error"`.

**Solutions:**
1. Verify MongoDB is running: `docker-compose -f infra/docker-compose.yml ps mongo`
2. Check connection string: ensure `MONGODB_URI` matches the exposed port
3. Check MongoDB logs: `docker-compose -f infra/docker-compose.yml logs mongo`
4. For Atlas: verify IP whitelist and credentials

### Redis Connection Failures

**Symptom:** Cache operations fail; API may start but with degraded performance.

**Solutions:**
1. Verify Redis is running: `docker-compose -f infra/docker-compose.yml ps redis`
2. Check connection string: ensure `REDIS_URL` matches the exposed port
3. Check Redis logs: `docker-compose -f infra/docker-compose.yml logs redis`

### Provider Health Check Failures

**Symptom:** `/health` shows `"llm": "error"`.

**Solutions:**
1. Verify `GEMINI_API_KEY` is set and valid
2. Check Google Cloud API quotas and billing
3. The API still starts with a degraded LLM status — mock provider is used as fallback

### Port Conflicts

**Symptom:** `EADDRINUSE` error on startup.

**Solutions:**
1. Check what's using the port: `lsof -i :8080` (or `:3000`)
2. Kill the conflicting process or change the port in `.env.local`
3. For Docker: ensure host ports are not already mapped

### Docker Build Failures

**Symptom:** `docker-compose up --build` fails.

**Solutions:**
1. Ensure Docker is running and has sufficient resources (4GB+ RAM)
2. Check Dockerfile syntax in `api/Dockerfile` and `web/Dockerfile`
3. Run `docker-compose build --no-cache` to force a clean rebuild

---

*Last updated: 2026-06-06*
