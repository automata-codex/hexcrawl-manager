import path from 'path';
import { getRepoRoot } from './get-repo-root.ts';

export function getRepoPath(...segments: string[]): string {
  return path.join(getRepoRoot(), ...segments);
}
