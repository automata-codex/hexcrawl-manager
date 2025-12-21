# Configurable Data Directory Specification

## Overview

After splitting the code and campaign data into separate repositories, the application needs a unified way to locate campaign data. This spec standardizes how the web app, CLI, and shared packages discover and use the data directory.

## Goals

1. Fresh clone of the code repo works immediately with example data (no setup required)
2. Local development uses an environment variable to point to campaign data
3. Build/deploy can specify the data path at build time
4. Single source of truth for data path configuration across all packages

## Environment Variable

**Name:** `ACHM_DATA_PATH`

**Behavior:**
- If set, use this path as the data directory root (relative paths resolved from `process.cwd()`)
- If not set, default to `./data`

**Deprecation:** The existing `REPO_ROOT` environment variable should be deprecated in favor of `ACHM_DATA_PATH`. During a transition period, if `REPO_ROOT` is set but `ACHM_DATA_PATH` is not, fall back to `${REPO_ROOT}/data` and emit a deprecation warning.

## Directory Structure

```
skyreach-code/
├── data/                    # Example/starter data (committed to code repo)
│   ├── characters/
│   ├── encounters/
│   ├── ... (minimal examples)
│   ├── routes.yml
│   ├── sidebar.yml
│   └── public/              # Static assets for example data
│       └── css/
├── data-skyreach/           # Symlink to campaign repo (gitignored)
└── .env                     # ACHM_DATA_PATH=./data-skyreach
```

## Implementation Changes

### 1. packages/data/src/paths.ts

Replace the current implementation with:

```typescript
import path from 'path';

let cachedDataPath: string | null = null;

/**
 * Get the campaign data directory path.
 * Priority:
 * 1. ACHM_DATA_PATH env var
 * 2. REPO_ROOT env var + '/data' (deprecated, emit warning)
 * 3. Default to './data'
 */
export function getDataPath(): string {
  if (cachedDataPath) return cachedDataPath;

  if (process.env.ACHM_DATA_PATH?.trim()) {
    cachedDataPath = path.resolve(process.env.ACHM_DATA_PATH);
    return cachedDataPath;
  }

  if (process.env.REPO_ROOT?.trim()) {
    console.warn(
      '[DEPRECATED] REPO_ROOT is deprecated. Use ACHM_DATA_PATH instead.'
    );
    cachedDataPath = path.resolve(process.env.REPO_ROOT, 'data');
    return cachedDataPath;
  }

  cachedDataPath = path.resolve(process.cwd(), 'data');
  return cachedDataPath;
}

/**
 * Resolve a path relative to the campaign data directory.
 */
export function resolveDataPath(rel: string): string {
  return path.join(getDataPath(), rel);
}

/**
 * Get the public assets directory (for Astro's publicDir).
 */
export function getPublicDir(): string {
  return path.join(getDataPath(), 'public');
}

/**
 * Clear the cached data path (useful for tests).
 */
export function clearDataPathCache(): void {
  cachedDataPath = null;
}
```

### 2. packages/data/src/load-config.ts

Remove `skyreach.config.json` and `load-config.ts` entirely. The `repoRoot` field is no longer needed since we're using `ACHM_DATA_PATH` directly.

Update any imports of `loadConfig()` to use `getDataPath()` instead.

### 3. apps/web/astro.config.ts

Update to use the shared path resolution:

```typescript
import { getDataPath, getPublicDir } from '@skyreach/data';

export default defineConfig({
  // ... other config
  publicDir: getPublicDir(),
  // ... other config
});
```

**Note:** Astro config runs at build time, so the env var must be set before running `astro build` or `astro dev`.

### 4. apps/web/src/content.config.ts

Replace hardcoded `DATA_DIR`:

```typescript
import { getDataPath } from '@skyreach/data';

const DATA_DIR = getDataPath();

const DIRS = {
  ARTICLES: `${DATA_DIR}/articles`,
  BOUNTIES: `${DATA_DIR}/bounties`,
  // ... rest unchanged
} as const;
```

**Important:** Content collection loaders run at build time. The `@skyreach/data` package must be built before the web app, and the env var must be set.

### 5. apps/web/scripts/*.ts

Update scripts that reference `DATA_DIR`:

- `validate-yaml-config.ts`
- `generate-config.ts`

Replace hardcoded paths with:

```typescript
import { getDataPath } from '@skyreach/data';

const DATA_DIR = getDataPath();
```

### 6. CLI Package Updates

The CLI currently uses `loadConfig()` to find `skyreach.config.json`. Update CLI commands to use `getDataPath()` from `@skyreach/data` instead.

Review and update:
- Any command that reads from or writes to the data directory
- Remove references to `skyreach.config.json`

### 7. .env.example

Add to the code repo root:

```bash
# Path to campaign data directory
# Default: ./data (example data included in repo)
# For local development with your campaign, create a symlink:
#   ln -s ../your-campaign-data/data data-skyreach
# Then set:
ACHM_DATA_PATH=./data-skyreach
```

### 8. .gitignore

Add:

```
data-skyreach
```

## Migration Steps

1. Create `getDataPath()` and related functions in `@skyreach/data`
2. Update `paths.ts` to use new implementation
3. Remove `load-config.ts` and `skyreach.config.json`
4. Update `content.config.ts` to use `getDataPath()`
5. Update `astro.config.ts` to use `getPublicDir()`
6. Update web app scripts
7. Update CLI commands
8. Check and update `packages/test-helpers` for env var usage
9. Add `.env.example` with documentation
10. Update `.gitignore`
11. Create minimal example data in `data/` directory
12. Test with both example data (no env var) and campaign data (with env var)

## Testing Checklist

- [ ] `npm run dev` works with no `.env` file (uses `./data`)
- [ ] `npm run dev` works with `ACHM_DATA_PATH=./data-skyreach`
- [ ] `npm run build` works with `ACHM_DATA_PATH` set
- [ ] CLI commands work with `ACHM_DATA_PATH` set
- [ ] Deprecation warning appears when using `REPO_ROOT`
- [ ] Static assets (images, CSS) load correctly from `publicDir`
- [ ] Content collections load from correct directory

## Additional Notes

1. Remove `skyreach.config.json` entirely — no longer needed.
2. Check `packages/test-helpers` for additional env vars that may need updating or namespacing.
