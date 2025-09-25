import crypto from 'crypto';
import fs from 'fs';
import { glob } from 'glob';
import path from 'path';
import yaml from 'yaml';

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

    // 4. Compute Fingerprint as hash
    const fingerprintObj = { sessionId, scribeIds };
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(fingerprintObj)).digest('hex');

    // 5. Check for Existing Completed Report
    const reportPath = path.join(REPO_PATHS.REPORTS(), `session-${sessionNum}.yaml`);
    if (fs.existsSync(reportPath)) {
      const reportContent = fs.readFileSync(reportPath, 'utf8');
      let reportYaml;
      try {
        reportYaml = yaml.parse(reportContent);
      } catch (err) {
        throw new Error(`Failed to parse completed report for ${sessionId}: ${err}`);
      }

      // Assume fingerprint is stored under 'fingerprint' key in the YAML
      const reportFingerprint = reportYaml?.fingerprint;
      if (typeof reportFingerprint === 'string' && reportFingerprint === fingerprint) {
        console.log(`Completed report for ${sessionId} already matches fingerprint. No-op.`);
        return;
      } else {
        throw new Error(`Completed report for ${sessionId} has a different fingerprint. Revert the prior apply or use a new session.`);
      }
    }

  } else {
    // Read completed session reports and collect their numbers
    // Look for finalized logs in `REPO_PATHS/SESSIONS()` and collect their numbers
    // Use `pickNextSessionId` to determine which session to apply
  }

// Glob both patterns for the chosen session; union the sets; ensure non-empty.
// Sort basenames using `sortScribeIds` (by date, then suffix: none < a < b < …).
// Fingerprint = `{ sessionId, sorted scribeIds }` (basenames only).

}
