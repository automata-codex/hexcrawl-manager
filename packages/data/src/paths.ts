import { getRepoPath } from '@skyreach/cli-kit';

/**
 * Resolve a path relative to the repo's `data/` directory.
 * @param rel
 */
export function resolveDataPath(rel: string): string {
  return getRepoPath('data', rel);
}
