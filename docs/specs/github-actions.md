# GitHub Actions Specification: hexcrawl-manager (Code Repo)

## Overview

This spec defines the GitHub Actions workflows for the public `hexcrawl-manager` code repository. The code repo validates that the framework builds and tests pass, but does not build or push Docker images — that responsibility moves to the data repo.

## Workflows to Keep (with modifications)

### 1. PR Tests and Build (`pr-tests.yml`)

**Trigger:** Pull requests to `develop` and `main`

**Purpose:** Validate code changes don't break the build or tests. Includes a full site build with example data.

**Changes needed:**
- Update `REPO_ROOT` env var to `ACHM_DATA_PATH`
- Tests run against the example data in `./data`
- Add a build job that compiles the full Astro site

```yaml
name: PR Tests

on:
  pull_request:
    branches: [develop, main]

concurrency:
  group: pr-tests-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  build:
    name: Build Site
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install deps
        run: npm ci
        env:
          FONTAWESOME_NPM_AUTH_TOKEN: ${{ secrets.FONTAWESOME_NPM_AUTH_TOKEN }}

      - name: Build packages and site
        run: npm run build
        env:
          FONTAWESOME_NPM_AUTH_TOKEN: ${{ secrets.FONTAWESOME_NPM_AUTH_TOKEN }}
          PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.PUBLIC_CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          # ACHM_DATA_PATH not set — uses default ./data (example data)

      - name: Verify build output
        run: |
          if [ ! -d "apps/web/dist" ]; then
            echo "Build output not found!"
            exit 1
          fi
          echo "Build successful ✓"

  tests:
    name: ${{ matrix.cmd }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        cmd:
          - "npm run -w @skyreach/cli test"
          - "npm run -w @skyreach/cli test:int"

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install deps
        run: npm ci
        env:
          FONTAWESOME_NPM_AUTH_TOKEN: ${{ secrets.FONTAWESOME_NPM_AUTH_TOKEN }}

      - name: Build packages
        run: npm run build
        env:
          FONTAWESOME_NPM_AUTH_TOKEN: ${{ secrets.FONTAWESOME_NPM_AUTH_TOKEN }}
          PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.PUBLIC_CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}

      - name: Run ${{ matrix.cmd }}
        run: ${{ matrix.cmd }}
        env:
          ACHM_DATA_PATH: '${{ github.workspace }}/data'
          TEST_REPO_BASE: '${{ github.workspace }}/test-repos'
```

### 2. Require Changeset (`require-changeset.yml`)

**Trigger:** Pull requests to `develop`

**Purpose:** Ensure code changes include a changeset for versioning.

**Changes needed:** None — keep as-is.

### 3. Release Guard (`release-guard.yml`)

**Trigger:** Pull requests to `main`

**Purpose:** Ensure version bumps are applied before merging to main.

**Changes needed:** None — keep as-is.

### 4. Tag Workspaces (`tag-workspaces.yml`)

**Trigger:** Push to `main`

**Purpose:** Create git tags for workspace version bumps (e.g., `@skyreach/web@1.2.3`).

**Changes needed:** None — keep as-is. These tags are what the data repo will reference.

## Workflows to Remove

### Docker Build (`docker-build.yml`)

**Remove entirely.** Docker image building moves to the data repo.

The code repo no longer needs to:
- Build Docker images
- Push to GHCR
- Handle deployment secrets (Clerk keys, etc.)

## Secrets Required

- `FONTAWESOME_NPM_AUTH_TOKEN` — For installing Font Awesome Pro packages
- `PUBLIC_CLERK_PUBLISHABLE_KEY` — For Clerk auth (needed at build time for SSR)
- `CLERK_SECRET_KEY` — For Clerk auth (needed at build time for SSR)

## Secrets to Remove

After migration, these secrets can stay but are no longer used for Docker builds (that's now in the data repo):
- Docker/GHCR-related secrets (if any were separate from `GITHUB_TOKEN`)

## Migration Steps

1. Remove `docker-build.yml`
2. Update `pr-tests.yml` to:
   - Use `ACHM_DATA_PATH` instead of `REPO_ROOT`
   - Add a full site build job (not just package builds)
3. Remove unused secrets after data repo workflows are confirmed working
4. Update CLAUDE.md to reflect new workflow structure

## Notes

- The code repo validates itself with example data on every PR, including a full site build
- Real deployment is triggered from the data repo, which pins a specific code version
- This matches the pattern users will follow: fork the code, create their own data repo, deploy from there
