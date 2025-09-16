import path from 'path';
import { loadConfig } from './load-config.ts';

export function getRepoPath(...segments: string[]): string {
  return path.join(loadConfig().repoRoot, ...segments);
}
