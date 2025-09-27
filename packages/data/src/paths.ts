import { getRepoPath } from '@skyreach/cli-kit';

export function resolveDataPath(rel: string): string {
  return getRepoPath('data', rel);
}
