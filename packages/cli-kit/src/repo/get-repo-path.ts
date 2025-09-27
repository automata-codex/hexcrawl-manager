import path from 'path';

import { getRepoRoot } from './get-repo-root.ts';

/**
 * Get an absolute path within the repository.
 * @param segments
 */
export function getRepoPath(...segments: string[]): string {
  return path.join(getRepoRoot(), ...segments);
}
