import { glob } from 'glob';
import path from 'path';

import { REPO_PATHS } from '../../../shared-lib/constants';
import { pickNextSessionId } from '../../../shared-lib/pick-next-session-id';
import { sortScribeIds } from '../../../shared-lib/sort-scribe-ids';

export async function apApply(sessionId?: string) {
  console.log('weave ap apply', sessionId);

  if (sessionId) {
    // 1. Validate Session ID Format
    if (!/^session-\d{4}$/.test(sessionId)) {
      throw new Error(`Invalid sessionId format: ${sessionId}. Expected format is session-####.`);
    }
    const sessionNum = sessionId.split('-')[1];
    const sessionsDir = REPO_PATHS.SESSIONS();

    // 2. Discover Finalized Scribe Logs
    const pattern1 = path.join(sessionsDir, `session_${sessionNum}_*.jsonl`);
    const pattern2 = path.join(sessionsDir, `session_${sessionNum}[a-z]_*.jsonl`);
    const files1 = glob.sync(pattern1);
    const files2 = glob.sync(pattern2);
    const allFiles = Array.from(new Set([...files1, ...files2]));
    if (allFiles.length === 0) {
      throw new Error(`No finalized logs for ${sessionId}.`);
    }

    // 3. Sort Scribe IDs
    const unsortedScribeIds = allFiles.map(f => path.basename(f, '.jsonl'));
    const scribeIds = sortScribeIds(unsortedScribeIds);
    // Fingerprint = `{ sessionId, sorted scribeIds }` (basenames only).

  } else {
    // Read completed session reports and collect their numbers
    // Look for finalized logs in `REPO_PATHS/SESSIONS()` and collect their numbers
    // Use `pickNextSessionId` to determine which session to apply
  }

// Glob both patterns for the chosen session; union the sets; ensure non-empty.
// Sort basenames using `sortScribeIds` (by date, then suffix: none < a < b < …).
// Fingerprint = `{ sessionId, sorted scribeIds }` (basenames only).

}
