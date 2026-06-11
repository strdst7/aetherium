---
title: Docker Dev Workflow
date: 2026-06-07
context: /gsd-explore — containerization and env switching
---

## Decision

Prod/staging uses `docker-compose.yml` with Atlas URI and standard ports.
Local dev uses `docker-compose.override.yml` (auto-applied by `docker compose up`).

## Rationale

- **Override files** keep prod config untouched while enabling seamless local dev.
- `restart: unless-stopped` ensures services auto-recover without manual intervention.
- Resource limits prevent any single service from starving the host during multi-service runs.
- Port remapping (API 3001, Mongo 27018) avoids conflicts with host-installed services.

## Key conventions

- Override file lives beside main compose file in `infra/`.
- `NODE_ENV=development` set explicitly in override, never in prod compose.
- `MONGODB_URI` switches between local container (`mongodb://mongodb:27017/AetheriumDEV`) and Atlas.
- No credentials stored in compose files — always use `.env` or override env vars.
