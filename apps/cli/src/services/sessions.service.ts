import { pad } from '@skyreach/cli-kit';
import { loadAllYamlInDir, REPO_PATHS } from '@skyreach/data';
import { glob } from 'glob';
import path from 'path';

import type { SessionReport } from '@skyreach/schemas';

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

export function loadAllSessionReports(): SessionReport[] {
  return loadAllYamlInDir<SessionReport>(REPO_PATHS.REPORTS());
}
