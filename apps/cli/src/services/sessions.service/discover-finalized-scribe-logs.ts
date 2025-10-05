import { REPO_PATHS } from '@skyreach/data';
import { glob } from 'glob';
import path from 'path';

export function discoverFinalizedScribeLogs(sessionNumber: string): string[] {
  const pattern1 = path.join(
    REPO_PATHS.SESSIONS(),
    `session_${sessionNumber}_*.jsonl`,
  );
  const pattern2 = path.join(
    REPO_PATHS.SESSIONS(),
    `session_${sessionNumber}[a-z]_*.jsonl`,
  );
  const files1 = glob.sync(pattern1);
  const files2 = glob.sync(pattern2);
  return Array.from(new Set([...files1, ...files2]));
}
