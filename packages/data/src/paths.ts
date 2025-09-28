import { getRepoPath } from './get-repo-path';

/**
 * Resolve a path relative to the repo's `data/` directory.
 * @param rel
 */
export function resolveDataPath(rel: string): string {
  return getRepoPath('data', rel);
}
