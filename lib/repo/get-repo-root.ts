import { loadConfig } from './load-config.ts';

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

