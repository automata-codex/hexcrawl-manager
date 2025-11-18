# Deployment Guide

## Railway Deployment

Skyreach is configured to deploy to Railway, which provides full filesystem access needed for the file-based campaign data storage.

### Prerequisites

1. Railway account (https://railway.app)
2. Clerk account for authentication (https://clerk.com)

### Initial Setup

1. **Create a new Railway project:**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose the `skyreach` repository
   - Railway will automatically detect the `railway.toml` configuration

2. **Configure environment variables:**

   In your Railway project settings, add the following variables:

   ```bash
   # Clerk Authentication
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...  # From Clerk dashboard
   CLERK_SECRET_KEY=sk_live_...              # From Clerk dashboard
   ```

   Note: `NODE_ENV=production` is automatically set by Railway.

3. **Deploy:**

   Railway will automatically deploy on push to your main branch. You can also trigger manual deployments from the Railway dashboard.

### Build Process

The build process is defined in `railway.toml` and `nixpacks.toml`:

1. **Runtime dependencies:** Railway/Nixpacks will install:
   - Node.js 22.20.0 (from `.nvmrc` and `package.json` engines)
   - Python 3.11 Full (for clue-linker script)
2. Install all dependencies: `npm install`
3. Build the web app: `npm run build --workspace=@skyreach/web`
   - This runs `prebuild` script which:
     - Builds all packages
     - Validates encounter content
     - **Runs clue-linker** (Python script that generates clue links)
     - Caches AP totals
   - Then builds the Astro site

**Note:** The clue-linker step installs ML dependencies (PyTorch, transformers) which can make the first build slow (~5-10 minutes). Subsequent builds may be faster if Railway caches dependencies.

**Alternative (faster builds):** If build times are too long, you can pre-generate `data/clue-links.yaml` locally and commit it to the repository:
1. Run `npm run build:clue-links` locally
2. Remove `data/clue-links.yaml` from `.gitignore`
3. Commit the generated file
4. Update `apps/web/package.json` prebuild script to skip `build:clue-links`

### Directory Structure in Deployment

The deployed application includes:
- `/apps/web/dist/` - Built Astro application
- `/data/` - Campaign data files (YAML, JSONL)
- `/packages/` - Shared packages

All data files are part of the Git repository and are deployed with the application.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key for client-side auth |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key for server-side auth |
| `PORT` | Auto-set | Railway sets this automatically (usually 8080) |
| `NODE_ENV` | Auto-set | Set to `production` by Railway automatically |

**Note:** The app is configured to listen on `0.0.0.0:$PORT` to work with Railway's networking.

### Monitoring

- **Logs:** Available in Railway dashboard under the "Deployments" tab
- **Health check:** Railway pings `/` endpoint to verify the app is running
- **Restart policy:** Automatically restarts on failure (max 10 retries)

### Troubleshooting

**Build failures:**
- Check that all required data files exist in the repository
- Verify that `data/ap-ledger.jsonl` exists (required by prebuild script)

**Runtime errors:**
- Check Railway logs for details
- Verify environment variables are set correctly
- Ensure Clerk domain is configured for your Railway URL

**Authentication issues:**
- Verify Clerk environment variables are correct
- Check that your Railway deployment URL is added to Clerk's allowed domains

### Local Development

The web app works differently in development vs. production:

- **Dev mode** (`NODE_ENV !== 'production'`):
  - Reads AP ledger directly from filesystem
  - Always shows latest data

- **Production mode** (`NODE_ENV === 'production'`):
  - Uses cached AP totals generated at build time
  - Faster performance

To test production behavior locally:
```bash
NODE_ENV=production npm run preview
```

### Deployment Checklist

Before deploying:
- [ ] All changes committed to Git
- [ ] Tests passing (`npm test`)
- [ ] Build successful locally (`npm run build:web`)
- [ ] Environment variables configured in Railway
- [ ] Clerk domain allowlist updated with Railway URL

---

## Future Improvement: Docker + GitHub Actions

**Status:** Planned for future implementation

This approach would provide faster builds, smaller deployments, and maximum portability.

### Overview

Instead of building on Railway with Python dependencies, use GitHub Actions to build a Docker image and deploy it anywhere.

### Benefits

- ✅ **Fast builds** - 2-3 minutes instead of 10-15 minutes
- ✅ **Small images** - No Python/ML dependencies needed
- ✅ **Platform agnostic** - Deploy to Railway, Fly.io, AWS, GCP, Azure, or any VPS
- ✅ **Automated** - Push to GitHub triggers image build
- ✅ **Consistent** - Same image for dev/staging/production environments
- ✅ **Cached builds** - GitHub Actions caches Docker layers

### Workflow

1. **Local development:**
   - Make changes to code/data
   - When hex/clue data changes: Run `npm run build:clue-links`
   - Commit changes including `data/clue-links.yaml`
   - Push to GitHub

2. **GitHub Actions (automatic):**
   - Triggered on push to `main` or `develop` branch
   - Builds Docker image (no Python needed since clue-links is pre-generated)
   - Pushes image to GitHub Container Registry (ghcr.io)
   - Tags with branch name and commit SHA

3. **Deployment (Railway or elsewhere):**
   - Configure Railway to deploy from Docker image
   - Or deploy to any other platform that supports Docker

### Implementation Checklist

When ready to implement:

- [ ] **Pre-generate clue links:**
  - Remove `data/clue-links.yaml` from `.gitignore`
  - Run `npm run build:clue-links` locally
  - Commit `data/clue-links.yaml` to repository

- [ ] **Update build scripts:**
  - Modify `apps/web/package.json` prebuild to skip `build:clue-links`
  - Remove Python from `nixpacks.toml` (or delete file entirely)

- [ ] **Create Docker files:**
  - `Dockerfile` - Multi-stage build (build stage + production stage)
  - `.dockerignore` - Exclude unnecessary files from image

- [ ] **Create GitHub Action:**
  - `.github/workflows/docker-build.yml`
  - Build and push on push to main/develop
  - Tag with branch name and commit SHA

- [ ] **Configure Railway:**
  - Switch from "Deploy from GitHub repo" to "Deploy from Docker image"
  - Point to GitHub Container Registry image
  - Set auto-deploy on new image tags

### Dockerfile Structure (Reference)

```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build --workspace=@skyreach/web

# Production stage
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "apps/web/dist/server/entry.mjs"]
```

### GitHub Action Structure (Reference)

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.ref_name }}
```

### Migration Steps

1. Pre-generate and commit clue-links file
2. Update build scripts to skip clue-linker
3. Create and test Dockerfile locally
4. Create GitHub Action workflow
5. Test automatic image builds
6. Reconfigure Railway to use Docker image
7. Verify deployment works
8. Remove Python dependencies from repository
