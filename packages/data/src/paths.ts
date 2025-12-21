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
      '[DEPRECATED] REPO_ROOT is deprecated. Use ACHM_DATA_PATH instead.',
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
