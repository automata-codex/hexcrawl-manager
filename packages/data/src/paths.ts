import path from 'path';

import { loadConfig } from './load-config';

/**
 * Get an absolute path within the repository.
 * @param segments
 */
export function getRepoPath(...segments: string[]): string {
  return path.join(getRepoRoot(), ...segments);
}

/**
 * Returns the repository root directory, respecting the REPO_ROOT env override.
 * Falls back to config if not set.
 */
export function getRepoRoot(): string {
  if (process.env.REPO_ROOT && process.env.REPO_ROOT.trim()) {
    return process.env.REPO_ROOT;
  }
  return loadConfig()?.repoRoot ?? process.cwd();
}

/**
 * Resolve a path relative to the repo's `data/` directory.
 * @param rel
 */
export function resolveDataPath(rel: string): string {
  return getRepoPath('data', rel);
}
