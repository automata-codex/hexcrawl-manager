# Docker Deployment Plan for Skyreach

## Context

Skyreach is a campaign manager monorepo with:
- File-based data storage (YAML, JSONL files in `data/` directory)
- Astro web app with SSR (server-side rendering)
- CLI tool for session management
- Python script (`clue-linker`) that generates ML-based clue-to-hex mappings

## Current Deployment (Railway with Nixpacks)

**How it works:**
- Push to GitHub → Railway builds with Nixpacks
- Nixpacks installs Node.js 22 + Python 3.11
- Build runs `npm run build:clue-links` (Python script)
- Python installs PyTorch, transformers, sentence-transformers (~800MB+)
- Then builds Astro app
- Deploys and runs on Railway

**Problems:**
- ⏱️ **Slow builds** - 10-15 minutes due to Python/ML dependencies
- 🔒 **Platform lock-in** - Requires Nixpacks (Railway-specific)
- 💾 **Large builds** - Unnecessary Python dependencies in production

## Proposed Solution: Docker + GitHub Actions

### Overview

Pre-generate the clue links file locally, then use GitHub Actions to build a Docker image without Python dependencies. Deploy that image anywhere.

### Workflow

```
┌─────────────────┐
│ Local Machine   │
│ - Edit data     │
│ - Run clue-link │──┐
│ - Commit & push │  │
└─────────────────┘  │
                     ▼
           ┌──────────────────┐
           │ GitHub           │
           │ - Code + data    │
           │ - clue-links.yaml│──┐
           └──────────────────┘  │
                                 │ Push triggers
                                 ▼
                    ┌────────────────────────┐
                    │ GitHub Actions         │
                    │ - Build Docker image   │
                    │ - No Python needed!    │
                    │ - Push to ghcr.io      │
                    └────────────────────────┘
                                 │
                                 │ Image ready
                                 ▼
                    ┌────────────────────────┐
                    │ Deploy Anywhere        │
                    │ - Railway              │
                    │ - Fly.io               │
                    │ - AWS/GCP/Azure        │
                    │ - Self-hosted VPS      │
                    └────────────────────────┘
```

### Benefits

- ✅ **Fast builds** - 2-3 minutes instead of 10-15 minutes
- ✅ **Small images** - ~200MB instead of 1GB+ (no Python/PyTorch)
- ✅ **Platform agnostic** - Deploy anywhere that supports Docker
- ✅ **Automated** - Push to GitHub triggers build automatically
- ✅ **Consistent** - Same image for dev/staging/production
- ✅ **Cacheable** - GitHub Actions caches Docker layers

### Key Changes Required

1. **Pre-generate clue links** (local, when hex/clue data changes)
2. **Skip clue-linker in production builds** (update package.json)
3. **Create Dockerfile** (multi-stage build)
4. **Create GitHub Action** (build and push image)
5. **Reconfigure deployment** (use image instead of source)

## Implementation Guide

### Step 1: Pre-generate Clue Links

**One-time setup:**

```bash
# Generate the file
npm run build:clue-links

# Remove from .gitignore
# Edit .gitignore and remove this line:
# /data/clue-links.yaml

# Commit it
git add data/clue-links.yaml .gitignore
git commit -m "Pre-generate clue links for Docker deployment"
```

**Going forward:**
- Run `npm run build:clue-links` whenever you change hex descriptions or floating clues
- Commit the updated `data/clue-links.yaml`

### Step 2: Update Build Scripts

**File:** `apps/web/package.json`

**Change prebuild from:**
```json
"prebuild": "npm run --prefix ../.. build:packages && tsx scripts/validate-encounter-content.ts && tsx scripts/cache-ap-totals.ts && npm run --prefix ../.. build:clue-links"
```

**To:**
```json
"prebuild": "npm run --prefix ../.. build:packages && tsx scripts/validate-encounter-content.ts && tsx scripts/cache-ap-totals.ts"
```

This removes the `build:clue-links` step since we're pre-generating it.

### Step 3: Create Dockerfile

**File:** `Dockerfile` (in repository root)

```dockerfile
# =============================================================================
# Build Stage - Compile TypeScript and build Astro app
# =============================================================================
FROM node:22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/*/

# Install all dependencies
RUN npm ci

# Copy source code and data files
COPY . .

# Build packages and web app
RUN npm run build --workspace=@skyreach/web

# =============================================================================
# Production Stage - Minimal runtime image
# =============================================================================
FROM node:22-alpine

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules

# Set production environment
ENV NODE_ENV=production

# Expose port (Railway sets PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "apps/web/dist/server/entry.mjs"]
```

### Step 4: Create .dockerignore

**File:** `.dockerignore` (in repository root)

```
# Dependencies
node_modules
npm-debug.log*

# Build outputs
dist
.astro
*.tsbuildinfo

# Development
.env
.env.local
.env.production

# Testing
.test-repos
_reports

# Git
.git
.gitignore

# IDE
.vscode
.idea
*.swp

# OS
.DS_Store

# Documentation (not needed in image)
docs/api

# Python environments (not needed since we pre-generate)
scripts/clue-linker/.venv-clue-linker
scripts/elevation-solver/.venv-elevation-solver

# Vercel/Railway configs (not needed in Docker)
.vercel
railway.toml
nixpacks.toml
```

### Step 5: Create GitHub Action

**File:** `.github/workflows/docker-build.yml`

```yaml
name: Build and Push Docker Image

on:
  push:
    branches:
      - main
      - develop
  workflow_dispatch: # Allow manual triggering

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Output image tags
        run: echo "Built and pushed ${{ steps.meta.outputs.tags }}"
```

**What this does:**
- Triggers on push to `main` or `develop` branches
- Builds Docker image
- Pushes to GitHub Container Registry (ghcr.io)
- Tags with branch name, commit SHA, and `latest` (for main branch)
- Uses GitHub Actions cache for faster subsequent builds

### Step 6: Test Docker Build Locally

Before pushing to GitHub, test the Docker build locally:

```bash
# Build the image
docker build -t skyreach:test .

# Run it locally
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  -e PUBLIC_CLERK_PUBLISHABLE_KEY=your_key \
  -e CLERK_SECRET_KEY=your_secret \
  skyreach:test

# Visit http://localhost:8080 to verify it works
```

### Step 7: Configure Railway to Use Docker Image

Once GitHub Actions is building and pushing images:

1. **In Railway project settings:**
   - Go to your service
   - Settings → Source
   - Change from "GitHub Repo" to "Docker Image"

2. **Set image source:**
   - Registry: `ghcr.io`
   - Image: `YOUR_GITHUB_USERNAME/skyreach:main`
   - Or use `develop` tag for development deployments

3. **Configure auto-deploy (optional):**
   - Railway can watch for new image tags
   - Or manually trigger deployments when needed

4. **Environment variables:**
   - Keep existing Clerk variables
   - PORT is still auto-set by Railway
   - NODE_ENV is set in Dockerfile

### Step 8: Deploy to Other Platforms (Optional)

The same Docker image can deploy anywhere:

**Fly.io:**
```bash
fly launch --image ghcr.io/YOUR_USERNAME/skyreach:main
fly secrets set PUBLIC_CLERK_PUBLISHABLE_KEY=... CLERK_SECRET_KEY=...
fly deploy
```

**AWS App Runner:**
- Point to ghcr.io image
- Set environment variables
- Configure auto-scaling

**Self-hosted VPS:**
```bash
docker pull ghcr.io/YOUR_USERNAME/skyreach:main
docker run -d -p 80:8080 \
  -e PORT=8080 \
  -e PUBLIC_CLERK_PUBLISHABLE_KEY=... \
  -e CLERK_SECRET_KEY=... \
  --name skyreach \
  ghcr.io/YOUR_USERNAME/skyreach:main
```

## Migration Checklist

When ready to implement:

- [ ] **Pre-generate clue links:**
  - [ ] Run `npm run build:clue-links`
  - [ ] Remove `data/clue-links.yaml` from `.gitignore`
  - [ ] Commit `data/clue-links.yaml`

- [ ] **Update build scripts:**
  - [ ] Edit `apps/web/package.json` prebuild to skip `build:clue-links`
  - [ ] Test build locally: `npm run build:web`

- [ ] **Create Docker files:**
  - [ ] Create `Dockerfile`
  - [ ] Create `.dockerignore`
  - [ ] Test Docker build locally

- [ ] **Create GitHub Action:**
  - [ ] Create `.github/workflows/docker-build.yml`
  - [ ] Push to GitHub
  - [ ] Verify action runs successfully
  - [ ] Check image appears in GitHub Packages

- [ ] **Reconfigure Railway:**
  - [ ] Change source to Docker image
  - [ ] Point to ghcr.io image
  - [ ] Verify deployment works
  - [ ] Test the site thoroughly

- [ ] **Clean up (optional):**
  - [ ] Remove `nixpacks.toml` (no longer needed)
  - [ ] Remove `railway.toml` (optional, won't hurt)
  - [ ] Remove Python from local dev dependencies if desired

## Expected Results

**Before (Railway with Nixpacks):**
- Build time: 10-15 minutes
- Image size: ~1GB+
- Platform: Railway only

**After (Docker via GitHub Actions):**
- Build time: 2-3 minutes (on GitHub), instant deploy (Railway just pulls image)
- Image size: ~200MB
- Platform: Anywhere

## Maintenance

**When you update code:**
- Just push to GitHub
- GitHub Actions builds new image automatically
- Railway auto-deploys (if configured) or deploy manually

**When you update hex/clue data:**
- Run `npm run build:clue-links` locally
- Commit the updated `data/clue-links.yaml`
- Push to GitHub
- Rest happens automatically

## Questions or Issues?

Common issues and solutions:

**Q: GitHub Actions failing with permission error?**
A: Go to repo Settings → Actions → General → Workflow permissions → Enable "Read and write permissions"

**Q: Railway can't pull image?**
A: Make sure the image is public, or configure Railway with GitHub token

**Q: Want to deploy to multiple environments?**
A: Use different tags (`:main`, `:develop`, `:staging`) and point each environment to its tag

**Q: Image is too large?**
A: Check if all dev dependencies are being excluded, optimize the multi-stage build

**Q: Build failing on clue-links file missing?**
A: Make sure you committed `data/clue-links.yaml` and removed it from `.gitignore`
