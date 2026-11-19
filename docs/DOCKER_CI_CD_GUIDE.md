# AgroSage — Docker and CI/CD Infrastructure Guide

> **Product**: AgroSage — Intelligence for Every Acre  
> **Repository**: [BGaganKumarreddy/Agrosage](https://github.com/BGaganKumarreddy/Agrosage)  
> **Status**: Verified Production Infrastructure Specification  

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Backend Dockerfile (`Dockerfile.backend`)](#2-backend-dockerfile)
3. [Frontend Dockerfile (`Dockerfile.frontend`)](#3-frontend-dockerfile)
4. [Docker Compose Orchestration (`compose.yaml`)](#4-docker-compose-orchestration)
5. [Environment Configuration](#5-environment-configuration)
6. [Local Docker Commands](#6-local-docker-commands)
7. [GitHub Actions CI/CD Pipeline](#7-github-actions-cicd-pipeline)
8. [GitHub Container Registry (GHCR) Image Publishing](#8-github-container-registry-ghcr-image-publishing)
9. [Required GitHub Repository Settings](#9-required-github-repository-settings)
10. [Pulling and Running Pre-built Images](#10-pulling-and-running-pre-built-images)
11. [Database Persistence & Backup](#11-database-persistence--backup)
12. [BYOK Credential Security Across Platforms](#12-byok-credential-security-across-platforms)
13. [Troubleshooting Guide](#13-troubleshooting-guide)

---

## 1. Architectural Overview

AgroSage uses a multi-tier containerized architecture designed for performance, reproducible builds, and strict secret isolation:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              Host Machine                              │
│                                                                        │
│   Browser (User) ───► http://localhost:3000                            │
│                              │                                         │
│   Direct API/Docs ──► http://localhost:8000                            │
└──────────────────────────────┼─────────────────────────────────────────┘
                               │
       ┌───────────────────────▼────────────────────────┐
       │             Docker Bridge Network              │
       │               (agrosage-network)               │
       │                                                │
       │   ┌────────────────────────────────────────┐   │
       │   │           Frontend Container           │   │
       │   │           (agrosage-frontend)          │   │
       │   │                                        │   │
       │   │   Nginx 1.27 Alpine                    │   │
       │   │   ├── Port 80 (Published to 3000)      │   │
       │   │   ├── Serves React 19 SPA bundle       │   │
       │   │   ├── Gzip compression                 │   │
       │   │   └── Reverse Proxy:                   │   │
       │   │       /api/ ──► http://backend:8000/api│   │
       │   │       /docs ──► http://backend:8000/doc│   │
       │   └───────────────────┬────────────────────┘   │
       │                       │                        │
       │   ┌───────────────────▼────────────────────┐   │
       │   │           Backend Container            │   │
       │   │           (agrosage-backend)           │   │
       │   │                                        │   │
       │   │   FastAPI + Uvicorn (Python 3.12)      │   │
       │   │   ├── Port 8000 (Published to 8000)    │   │
       │   │   ├── Unprivileged User (agrosage)     │   │
       │   │   ├── 7-Agent Agricultural Workflow    │   │
       │   │   ├── Curated ICAR & Scheme Knowledge  │   │
       │   │   └── Storage Mount: /app/data/storage │   │
       │   └───────────────────┬────────────────────┘   │
       └───────────────────────┼────────────────────────┘
                               │
               ┌───────────────▼───────────────┐
               │     Named Docker Volume       │
               │      (agrosage-storage)       │
               │                               │
               │   ├── auth.sqlite3            │
               │   ├── history.sqlite3         │
               │   └── .keys/ (KEK storage)    │
               └───────────────────────────────┘
```

---

## 2. Backend Dockerfile

The backend image is defined in `Dockerfile.backend` using a **two-stage build**:

- **Builder Stage (`ghcr.io/astral-sh/uv:0.6.5-python3.12-bookworm-slim`)**:
  - Leverages Astral `uv` for sub-second, deterministic dependency resolution.
  - Copies `pyproject.toml` and `uv.lock` first to maximize Docker layer caching.
  - Installs production dependencies without dev tools (`uv sync --frozen --no-dev`).
  - Pre-compiles Python bytecode (`UV_COMPILE_BYTECODE=1`).
- **Runtime Stage (`python:3.12-slim-bookworm`)**:
  - Contains only the compiled virtual environment, application source (`src/`), and curated agricultural data (`data/`).
  - Creates a dedicated non-root user and group (`agrosage:agrosage`, UID 10001).
  - Explicitly mounts `/app/data/storage` for persistent SQLite databases.
  - Exposes port `8000`.
  - Built-in zero-dependency health check using Python standard library `urllib` against `GET /api/v1/health`.

---

## 3. Frontend Dockerfile

The frontend image is defined in `Dockerfile.frontend` using a **two-stage build**:

- **Stage 1 (Builder — `node:22-alpine`)**:
  - Uses clean, reproducible `npm ci` driven by `frontend/package-lock.json`.
  - Injects `ARG VITE_API_BASE_URL=/api/v1` so API queries use relative same-origin paths handled by Nginx.
  - Runs `npm run build` with Vite, outputting minified static assets to `/app/dist`.
- **Stage 2 (Runtime — `nginx:1.27-alpine-slim`)**:
  - Copies compiled HTML/JS/CSS assets to `/usr/share/nginx/html`.
  - Configures `docker/nginx.conf` with:
    - Single Page Application (SPA) client-side routing fallback (`try_files $uri $uri/ /index.html`).
    - Reverse proxy routing `/api/` to `http://backend:8000/api/` (no CORS friction or hardcoded host IPs required).
    - Reverse proxy routing `/docs`, `/openapi.json`, and `/redoc` for interactive API documentation.
    - Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).
    - High-performance asset caching (`Cache-Control: public, max-age=31536000, immutable`).
    - Gzip compression for static files.
    - Health check endpoint at `/health`.

---

## 4. Docker Compose Orchestration

The application stack is orchestrated via `compose.yaml`:

- **Network**: All containers communicate over an isolated bridge network (`agrosage-network`).
- **Startup Order**: `frontend` declares `depends_on: backend: condition: service_healthy`, ensuring the UI does not start until the API passes its health probe.
- **Data Persistence**: Uses a top-level named volume `agrosage-storage` mounted at `/app/data/storage`. SQLite database files (`auth.sqlite3`, `history.sqlite3`) and encryption keys survive container stops, restarts, and image updates.
- **Port Mapping**:
  - Backend API: `8000:8000` (configurable via `${BACKEND_PORT:-8000}`)
  - Frontend Web UI: `3000:80` (configurable via `${FRONTEND_PORT:-3000}`)

---

## 5. Environment Configuration

Copy `.env.docker.example` to `.env` to configure optional custom ports or encryption settings:

```powershell
Copy-Item .env.docker.example .env
```

| Variable | Default in Compose | Purpose |
|---|---|---|
| `BACKEND_PORT` | `8000` | Port published on host machine for FastAPI backend |
| `FRONTEND_PORT` | `3000` | Port published on host machine for AgroSage React UI |
| `RYTHUSAATHI_AUTH_DB` | `/app/data/storage/auth.sqlite3` | SQLite database for identity, tenants, and BYOK credentials |
| `RYTHUSAATHI_HISTORY_DB` | `/app/data/storage/history.sqlite3` | SQLite database for farm profiles, chats, and advisory history |
| `AGROSAGE_MASTER_KEY` | *(empty)* | Optional 256-bit secret for master KEK derivation in Linux containers |

---

## 6. Local Docker Commands

### Build and Start Stack in Background

```bash
docker compose up --build -d
```

### View Running Containers & Health Status

```bash
docker compose ps
```

### View Live Combined Logs

```bash
docker compose logs -f
```

### View Backend Logs Only

```bash
docker compose logs -f backend
```

### View Frontend Logs Only

```bash
docker compose logs -f frontend
```

### Stop Services Safely (Preserving Named Volumes)

```bash
docker compose down
```

> [!WARNING]  
> Never use `docker compose down -v` for routine shutdown. The `-v` flag deletes named Docker volumes, destroying user accounts, farm profiles, and chat history.

---

## 7. GitHub Actions CI/CD Pipeline

The project includes two GitHub Actions workflows located in `.github/workflows/`:

### 1. `ci.yml` (Continuous Integration)

Runs on all pushes to `main` and on all Pull Requests targeting `main`.

- **`backend-ci` job**:
  - Sets up Python 3.12 and Astral `uv`.
  - Installs locked dependencies from `uv.lock`.
  - Executes the complete Pytest suite (`516 passed, 87 subtests`).
  - Runs fully offline with deterministic fixtures; zero external LLM API calls or provider keys required.
- **`frontend-ci` job**:
  - Sets up Node.js 22 with npm cache.
  - Runs `npm ci`.
  - Executes Vitest test suite (`36 passed across 5 test files`).
  - Executes Vite production build (`npm run build`).
- **`docker-validation` job**:
  - Validates `compose.yaml` using `docker compose config`.
  - Executes smoke builds of `Dockerfile.backend` and `Dockerfile.frontend` using GitHub Actions layer caching.

### 2. `docker-publish.yml` (Continuous Deployment)

Runs automatically when code is pushed to `main` or when release tags (`v*`) are pushed.

- Runs test verification gates first.
- Authenticates to **GitHub Container Registry (`ghcr.io`)** using the built-in `${{ secrets.GITHUB_TOKEN }}`.
- Sanitizes repository owner into lowercase for standard OCI image compatibility.
- Builds and publishes multi-layer cached images:
  - `ghcr.io/<owner>/agrosage-backend:latest`
  - `ghcr.io/<owner>/agrosage-frontend:latest`
  - Tagged with commit SHA (`sha-<short_sha>`) and Semantic Version tags on releases.

---

## 8. GitHub Container Registry (GHCR) Image Publishing

Images are published under the GitHub package namespace:

```text
ghcr.io/bgagankumarreddy/agrosage-backend:latest
ghcr.io/bgagankumarreddy/agrosage-frontend:latest
```

The workflow utilizes the standard `GITHUB_TOKEN` secret automatically provided by GitHub Actions runner environments. No external personal access tokens (PAT) or Docker Hub accounts are required.

---

## 9. Required GitHub Repository Settings

To allow the publishing workflow to push images to GHCR:

1. Open your repository on GitHub: `https://github.com/BGaganKumarreddy/Agrosage`
2. Navigate to **Settings** ──► **Actions** ──► **General**.
3. Under **Workflow permissions**, select:
   - **Read and write permissions** (allows `packages: write` for image publishing).
   - Check **Allow GitHub Actions to create and approve pull requests** (if applicable).
4. Save changes.

---

## 10. Pulling and Running Pre-built Images

Once images are published to GHCR, users can run AgroSage without building from source:

```bash
# Pull published images
docker pull ghcr.io/bgagankumarreddy/agrosage-backend:latest
docker pull ghcr.io/bgagankumarreddy/agrosage-frontend:latest

# Create network & volume
docker network create agrosage-network
docker volume create agrosage-storage

# Run backend
docker run -d \
  --name agrosage-backend \
  --network agrosage-network \
  -p 8000:8000 \
  -v agrosage-storage:/app/data/storage \
  ghcr.io/bgagankumarreddy/agrosage-backend:latest

# Run frontend
docker run -d \
  --name agrosage-frontend \
  --network agrosage-network \
  -p 3000:80 \
  ghcr.io/bgagankumarreddy/agrosage-frontend:latest
```

---

## 11. Database Persistence & Backup

All application state is stored in SQLite inside the `agrosage-storage` Docker volume:

- `auth.sqlite3`: Users, tenants, sessions, and AES-256-GCM encrypted BYOK keys.
- `history.sqlite3`: Farm profiles, conversation threads, and advisory history.
- `.keys/`: Protected KEK encryption key files (0600 permissions).

### Backup Local Volume Data

To create a backup archive of the SQLite database:

```bash
docker run --rm \
  -v agrosage-storage:/data \
  -v ${PWD}:/backup \
  alpine tar czf /backup/agrosage-backup-$(date +%Y%m%d).tar.gz -C /data .
```

### Restore Backup

```bash
docker run --rm \
  -v agrosage-storage:/data \
  -v ${PWD}:/backup \
  alpine sh -c "tar xzf /backup/agrosage-backup-*.tar.gz -C /data"
```

---

## 12. BYOK Credential Security Across Platforms

AgroSage enforces a multi-tier envelope encryption model (`AES-256-GCM`):

```
Provider Secret Key (Gemini/Groq/Cerebras)
    ▲
    │ Encrypted with DEK (Data Encryption Key)
    ▼
DEK Envelope
    ▲
    │ Encrypted with KEK (Key Encryption Key)
    ▼
Platform Key Store (OS DPAPI / FileKeyStore / EnvKeyStore)
```

| Environment | Key Protection Mechanism | Security Characteristics |
|---|---|---|
| **Local Windows** | `WindowsCredentialStore` (DPAPI via Credential Manager) | Hardware/user-backed Windows DPAPI; keys cannot be decrypted outside the user login session. |
| **Docker Container (Linux)** | `FileKeyStore` (`/app/data/storage/.keys`) | 256-bit KEK generated in named volume; Unix file mode `0600` (owner read/write only). Persists across container restarts. |
| **Docker with Secret** | `EnvKeyStore` (`AGROSAGE_MASTER_KEY`) | Derived via SHA-256 from explicit container secret; portable across orchestrated container clusters. |
| **CI / Pytest** | `InMemoryKeyStore` | Transient key store in RAM; automatically used when `RYTHUSAATHI_ALLOW_IN_MEMORY_KEY_STORE=1`. Never used in production. |

> [!NOTE]  
> Windows DPAPI credentials do not automatically transfer into Linux containers. If you enroll BYOK credentials inside Docker, they will be protected by the container's `FileKeyStore` or `AGROSAGE_MASTER_KEY`.

---

## 13. Troubleshooting Guide

### Port 8000 or 3000 Already in Use

If another service is running on host port `8000` or `3000`, configure alternate ports in `.env`:

```bash
BACKEND_PORT=8080
FRONTEND_PORT=8081
```

### Backend Container Fails Healthcheck

Inspect backend application logs:

```bash
docker compose logs backend
```

Check the health status manually:

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:

```json
{"status":"healthy","service":"rythusaathi","agents":7,"version":"0.1.0"}
```

### Resetting Storage for Clean Testing

To completely reset the SQLite databases:

```bash
docker compose down -v
docker compose up -d
```
