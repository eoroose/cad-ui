# CAD Viewer Platform

A Dockerized STEP file viewer that converts CAD assembly files to interactive 3D scenes in the browser — no local CAD software required.

Upload a `.step` file → the pipeline tessellates it server-side → the result renders as a navigable 3D model with a component tree.

---

## Quick Start

**Requirements:** Docker Desktop (no Node.js, Python, or other local installs needed)

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd cad-ui

# 2. Create your environment file
cp .env.example .env

# 3. Build and start all services (first build takes ~5 min for the CAD worker)
docker compose up --build -d

# 4. Open the app
open http://localhost:5173
```

---

## Credentials & Access

### Application Login

The seed script creates a default dev account on first startup:

| Field | Value |
|---|---|
| Email | `dev@example.com` |
| Password | `password` |

### Service URLs & Credentials

| Service | URL | Username | Password |
|---|---|---|---|
| **Frontend** | http://localhost:5173 | — | — |
| **REST API** | http://localhost:3000 | — | — |
| **MinIO Console** | http://localhost:9001 | `minioadmin` | `minioadmin` |
| **PostgreSQL** | `localhost:5432` | `caduser` | see `.env` → `POSTGRES_PASSWORD` |

> MinIO credentials come from `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` in your `.env` file. The defaults from `.env.example` are `minioadmin` / `minioadmin`.

### Connecting to PostgreSQL with DBeaver

1. Open DBeaver → New Connection → PostgreSQL
2. Fill in:
   - **Host:** `localhost`
   - **Port:** `5432`
   - **Database:** `cadplatform`
   - **Username:** `caduser`
   - **Password:** value of `POSTGRES_PASSWORD` in your `.env` (default: `changeme_dev`)
3. Click **Test Connection** → **Finish**

---

## Environment Setup

### Creating `.env`

```bash
cp .env.example .env
```

For local development the defaults in `.env.example` work out of the box. For any non-local deployment, change the secrets before starting:

```bash
# .env — values you should change for real environments
POSTGRES_PASSWORD=changeme_dev          # PostgreSQL password
JWT_SECRET=change_this_jwt_secret_32_chars_min
REFRESH_TOKEN_SECRET=change_this_refresh_secret_32_chars
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

### Full Variable Reference

| Variable | Default | Required | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | `changeme_dev` | ✓ | PostgreSQL password for `caduser` |
| `JWT_SECRET` | — | ✓ | HS256 signing key for access tokens (min 32 chars) |
| `REFRESH_TOKEN_SECRET` | — | ✓ | HS256 signing key for refresh tokens (min 32 chars) |
| `MINIO_ROOT_USER` | `minioadmin` | ✓ | MinIO root user (also used as `AWS_ACCESS_KEY_ID`) |
| `MINIO_ROOT_PASSWORD` | `minioadmin` | ✓ | MinIO root password (also used as `AWS_SECRET_ACCESS_KEY`) |
| `S3_BUCKET` | `cad-assets-dev` | ✓ | Bucket name created on startup |
| `PUBLIC_MINIO_URL` | `http://localhost:9000` | ✓ | Browser-reachable MinIO URL (used to rewrite presigned URLs) |
| `PORT` | `3000` | — | API server port |
| `NODE_ENV` | `development` | — | Node environment |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | — | CORS allowed origins |
| `VITE_API_BASE_URL` | `http://localhost:3000/api/v1` | — | API base URL used by the frontend |

### Useful Commands

```bash
# View logs for a specific service
docker compose logs -f cad-api
docker compose logs -f cad-worker
docker compose logs -f cad-viewer-web

# Stop everything
docker compose down

# Stop and wipe all data (volumes)
docker compose down -v

# Rebuild a single service after code changes
docker compose build cad-api && docker compose up -d --no-deps cad-api
```

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                       │
│   React 18 + Vite + R3F + Zustand (cad-viewer-web)     │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTP/JSON (REST)
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (cad-api)                      │
│   Express.js + Prisma + Zod + JWT + helmet              │
└───────┬──────────────────────┬──────────────────────────┘
        │  BullMQ enqueue       │  Prisma (SQL)
        ▼                       ▼
┌───────────────┐     ┌─────────────────────────┐
│  Redis 7      │     │  PostgreSQL 16           │
│  (job queue)  │     │  Users, Scenes, Jobs,    │
└───────┬───────┘     │  Assets, SceneNodes      │
        │              └─────────────────────────┘
        │  BullMQ dequeue
        ▼
┌─────────────────────────────────────────────────────────┐
│           CAD Worker (cad-worker)                       │
│   Node.js BullMQ listener + Python pythonocc-core       │
│   ingestion → parse → tessellate → export → upload      │
└──────────────────────┬──────────────────────────────────┘
                       │  boto3 (S3-compatible)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   MinIO (local S3)                      │
│  uploads/{userId}/{cuid}.step                           │
│  scenes/{sceneId}/merged.glb                            │
│  scenes/{sceneId}/scene.json                            │
└─────────────────────────────────────────────────────────┘
```

### Services

| Container | Image | Role |
|---|---|---|
| `postgres` | postgres:16-alpine | Relational store for users, scenes, jobs |
| `redis` | redis:7-alpine | BullMQ job queue backend |
| `minio` | minio/minio | S3-compatible object storage (dev replacement for AWS S3) |
| `minio-init` | minio/mc | One-shot bucket creation on first boot |
| `cad-api` | custom (node:20-alpine) | Express REST API |
| `cad-worker` | custom (ubuntu:22.04 + conda) | BullMQ worker + Python CAD pipeline |
| `cad-viewer-web` | custom (node:20-alpine) | Vite dev server for React frontend |

---

## How It Works: Upload → Process → Render

### Step 1 — Upload

The frontend requests a **presigned PUT URL** from the API. The file goes directly from the browser to MinIO — the API never proxies binary data. Once the upload completes, the frontend calls a `/confirm` endpoint which:

1. Verifies the file landed in MinIO (HeadObject)
2. Creates a `Job` record in PostgreSQL with status `PENDING`
3. Enqueues a BullMQ job with the S3 key and scene metadata

### Step 2 — Processing (CAD Worker)

The Node.js BullMQ listener picks up the job and spawns a Python subprocess:

```
ingestion.py   — downloads the .step from MinIO, validates magic bytes
parser.py      — STEPCAFControl_Reader reads the XDE document (hierarchy-aware)
tessellator.py — BRepMesh_IncrementalMesh converts each solid to a triangle mesh
exporter.py    — RWGltf_CafWriter writes a binary .glb file
hierarchy.py   — traverses XDE labels to extract component tree + 4×4 transforms
scene_writer.py — writes scene.json (node list, parentId links, transform matrices)
uploader.py    — uploads merged.glb + scene.json to MinIO, updates DB atomically
```

The worker emits `PROGRESS:N` lines that the Node sidecar parses and writes back to the Job record in Postgres, enabling real-time progress polling.

The key technical choice here is **STEPCAFControl_Reader** (not `STEPControl_Reader`) — the CAF reader preserves the assembly hierarchy and part names from the STEP file, which are then reflected in the scene tree.

### Step 3 — Render

The frontend polls the job status every 3 seconds using react-query. On `COMPLETED`:

1. Fetches the scene from `GET /scenes/:id` which returns presigned GET URLs for `merged.glb` and `scene.json`
2. `useGLTF()` loads the `.glb` — hardware-accelerated triangle mesh rendering via WebGL
3. `scene.json` is parsed to populate the assembly tree panel (left sidebar)
4. Clicking a node in the tree selects the corresponding mesh in the 3D canvas

### Data Model

```
User ──< Scene ──< SceneNode (tree, parentId, transformMatrix[16])
              ──< Job        (PENDING → PROCESSING → COMPLETED/FAILED)
              ──< Asset      (STEP input, GLB output, scene.json)
```

`SceneNode.transformMatrix` stores the 4×4 row-major world transform from the STEP assembly, enabling future joint/robot kinematic overlays without schema changes.

---

## Project Structure

```
cad-ui/
├── apps/
│   ├── cad-api/          # Express REST API (TypeScript)
│   ├── cad-worker/
│   │   ├── node/         # BullMQ listener (TypeScript)
│   │   └── python/       # OpenCascade pipeline (pythonocc-core)
│   └── cad-viewer-web/   # React frontend (Vite + R3F)
├── packages/
│   ├── shared-types/     # TypeScript DTOs shared by api + frontend
│   └── scene-schema/     # Zod schemas for runtime validation
├── prisma/
│   ├── schema.prisma
│   └── seed.ts           # Creates dev@example.com test user
├── docker-compose.yml
├── .env.example
└── .npmrc                # pnpm public-hoist-pattern for @types/* and @prisma/*
```

### pnpm Monorepo

The repo uses **pnpm workspaces** with a `turbo.json` build pipeline. All three apps share `packages/shared-types` and `packages/scene-schema` via `workspace:*` references. The `.npmrc` hoists `@types/*` and `@prisma/*` to root `node_modules` so TypeScript and Prisma resolve correctly inside Docker without a lockfile.

---

## Environment Variables

Copy `.env.example` to `.env` before first run. Key variables:

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_PASSWORD` | `changeme_dev` | PostgreSQL password |
| `JWT_ACCESS_SECRET` | — | HS256 signing key for access tokens |
| `JWT_REFRESH_SECRET` | — | HS256 signing key for refresh tokens |
| `S3_BUCKET` | `cad-assets-dev` | MinIO bucket name |
| `PUBLIC_MINIO_URL` | `http://localhost:9000` | Used to rewrite presigned URLs for browser access |

`PUBLIC_MINIO_URL` exists because presigned URLs are generated with the internal Docker hostname (`minio:9000`) but need to be reachable from the browser (`localhost:9000`). The API rewrites the hostname before returning them.

---

## Development Notes

- **No local Node/Python needed** — all builds happen inside Docker
- **Schema changes** — edit `prisma/schema.prisma`, then restart `cad-api` (the entrypoint runs `prisma db push` on every start)
- **Frontend hot reload** — Vite dev server is running inside the container; edits to `apps/cad-viewer-web/src/` require a container restart since the source is copied at build time. For active frontend development, running Vite locally (`pnpm --filter @cad/viewer-web dev`) and pointing it at `http://localhost:3000` is faster.
- **CAD worker rebuild** — the conda environment (pythonocc-core) is cached in Docker layers; only rebuilds when `environment.yml` changes (~5 min). Python source changes rebuild in seconds.
