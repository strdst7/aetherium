# Deploy Aetherium to Vercel

Deploy the Next.js web shell to Vercel with the Express API separately on Cloud Run.

---

## Architecture

```
Browser → Vercel (Next.js) → Cloud Run (Express API) → MongoDB Atlas + Redis Cloud
```

- **Frontend:** `web/` — Next.js 14, deploys to Vercel
- **API:** `api/` — Express, deploys to Cloud Run (or Railway/Fly.io)
- **DB:** MongoDB Atlas (or MongoDB-compatible cloud)
- **Cache:** Redis Cloud (or Upstash)

---

## Step 1: Deploy the API

### Option A: Google Cloud Run (recommended)

```bash
# Build and push
gcloud builds submit api/ --tag gcr.io/$PROJECT_ID/aetherium-api

# Deploy
gcloud run deploy aetherium-api \
  --image gcr.io/$PROJECT_ID/aetherium-api \
  --set-env-vars "MONGODB_URI=mongodb+srv://..." \
  --set-env-vars "REDIS_URL=redis://..." \
  --set-env-vars "API_PORT=8080" \
  --allow-unauthenticated
```

Note the deployed URL (e.g. `https://aetherium-api-xxxxx-uc.a.run.app`).

### Option B: Railway

```bash
# Push api/ as a separate Railway service
# Set env vars in Railway dashboard:
#   MONGODB_URI, REDIS_URL, API_PORT=8080
```

### Option C: Fly.io

```bash
fly launch --name aetherium-api
fly secrets set MONGODB_URI=... REDIS_URL=...
fly deploy
```

---

## Step 2: Deploy the Frontend to Vercel

### Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from web/ directory
cd web
vercel --prod \
  --env NEXT_PUBLIC_API_URL=https://aetherium-api-xxxxx-uc.a.run.app
```

### Using Vercel Dashboard

1. Push repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Add New Project
3. Import your GitHub repo
4. Configure:
   - **Root Directory:** `web`
   - **Framework:** Next.js
   - **Environment Variables:**
     - `NEXT_PUBLIC_API_URL` = your deployed API URL (e.g. `https://aetherium-api-xxxxx-uc.a.run.app`)
5. Deploy

### Required Environment Variables

| Variable | Example | Source |
|----------|---------|--------|
| `NEXT_PUBLIC_API_URL` | `https://api.aetherium.dev` | Deployed API URL |

---

## Step 3: Set Up MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Configure network access (allow Vercel/Cloud Run IPs or `0.0.0.0/0`)
3. Create a database user
4. Get your connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/aetherium
   ```

---

## Step 4: Set Up Redis Cloud

### Option A: Redis Cloud

1. Create a free DB at [redis.com](https://redis.com/try-free)
2. Note the endpoint and password

### Option B: Upstash (serverless Redis)

1. Create DB at [upstash.com](https://upstash.com)
2. Get `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

---

## Step 5: Set API Environment Variables

On your API hosting provider (Cloud Run / Railway / Fly.io), set:

```
MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/aetherium
REDIS_URL=redis://default:password@xxxxx.upstash.io:6379
API_PORT=8080
```

---

## Post-Deployment Verification

```bash
# Health check
curl https://aetherium-api-xxxxx-uc.a.run.app/health

# Expected: {"status":"healthy","services":{"db":"connected","redis":"connected","llm":"degraded"}}

# API info
curl https://aetherium-api-xxxxx-uc.a.run.app/v1/info

# Frontend
open https://aetherium.vercel.app
```

---

## Monorepo Notes

The root `package.json` uses npm workspaces (`api/`, `web/`). Vercel auto-detects
the `web/` workspace when you set **Root Directory** to `web/`. The API must be
deployed separately — it is not a Vercel Serverless Function.
