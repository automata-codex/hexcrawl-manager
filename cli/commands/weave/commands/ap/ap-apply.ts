import crypto from 'crypto';
import fs from 'fs';
import { glob } from 'glob';
import path from 'path';
import yaml from 'yaml';

import { firstCalendarDate, lastCalendarDate, selectParty } from '../../../scribe/projectors.ts';
import { REPO_PATHS } from '../../../shared-lib/constants';
import { isGitDirty } from '../../../shared-lib/git.ts';
import { pickNextSessionId } from '../../../shared-lib/pick-next-session-id';
import { sortScribeIds } from '../../../shared-lib/sort-scribe-ids';

export async function apApply(sessionId?: string) {
  // --- I. Get a valid sessionId ---
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

    const reportPath = path.join(REPO_PATHS.REPORTS(), `session-${sessionNum}.yaml`);
    if (fs.existsSync(reportPath)) {
      const reportContent = fs.readFileSync(reportPath, 'utf8');
      let reportYaml;
      try {
        reportYaml = yaml.parse(reportContent);
      } catch (err) {
        throw new Error(`Failed to parse report for ${sessionId}: ${err}`);
      }

      // 5. Check for Planned Report and Dirty Git
      if (reportYaml?.status === 'planned') {
        if (isGitDirty()) {
          throw new Error(`Planned report exists for ${sessionId}, but the working tree is dirty. Commit or stash changes, then re-run.`);
        }
      }
      // 6. Check for Existing Completed Report
      const reportFingerprint = reportYaml?.fingerprint;
      if (typeof reportFingerprint === 'string' && reportFingerprint === fingerprint) {
        console.log(`Completed report for ${sessionId} already matches fingerprint. No-op.`);
        return;
      } else if (reportYaml?.status !== 'planned') {
        throw new Error(`Completed report for ${sessionId} has a different fingerprint. Revert the prior apply or use a new session.`);
      }
    }
  } else {
    // Step 1: Discover finalized session logs
    const logFiles = fs.readdirSync(REPO_PATHS.SESSIONS()).filter(f => f.match(/^session_\d{4}[a-z]?_\d{4}-\d{2}-\d{2}\.jsonl$/));
    const sessionNumbers = logFiles.map(f => {
      const matches = f.match(/^session_(\d{4})/);
      if (!matches) {
        throw new Error(`Unexpected filename format: ${f}`);
      }
      return parseInt(matches[1], 10);
    });

    // Step 2: Identify pending sessions
    const reportFiles = fs.existsSync(REPO_PATHS.REPORTS()) ? fs.readdirSync(REPO_PATHS.REPORTS()) : [];
    const completedSessions = reportFiles
      .filter(f => f.match(/^session-\d{4}\.yaml$/))
      .map(f => f.match(/^session-(\d{4})\.yaml$/)![1])
      .map(f => parseInt(f, 10));
    const pendingSessions = sessionNumbers.filter(num => !completedSessions.includes(num));

    // Step 3: Pick the next session to apply
    if (pendingSessions.length === 0) {
      throw new Error('No pending sessions with finalized logs found.');
    }
    sessionId = pickNextSessionId(completedSessions, pendingSessions);
  }

  const sessionNum = parseInt(sessionId.split('-')[1], 10);

  // --- II: Discover Scribe IDs (finalized logs) ---
  const pattern1 = path.join(REPO_PATHS.SESSIONS(), `session_${sessionNum}_*.jsonl`);
  const pattern2 = path.join(REPO_PATHS.SESSIONS(), `session_${sessionNum}[a-z]_*.jsonl`);
  const files1 = fs.existsSync(REPO_PATHS.SESSIONS()) ? glob.sync(pattern1) : [];
  const files2 = fs.existsSync(REPO_PATHS.SESSIONS()) ? glob.sync(pattern2) : [];
  const allFiles = Array.from(new Set([...files1, ...files2]));
  if (allFiles.length === 0) {
    throw new Error(`No finalized logs for ${sessionId}.`);
  }

  // Scribe IDs sorted
  const unsortedScribeIds = allFiles.map(f => path.basename(f, '.jsonl'));
  const scribeIds = sortScribeIds(unsortedScribeIds);

  // --- III: Parse All Parts ---
  let events = [];
  for (const file of allFiles) {
    const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        events.push(event);
      } catch (err) {
        throw new Error(`Failed to parse JSONL in ${file}: ${err}`);
      }
    }
  }

  // --- IV: Derive Session Fields ---
  const sessionDate = events[0].ts.slice(0, 10); // YYYY-MM-DD from first event timestamp; `finalize` guarantees ordering

  const gameStartDate = firstCalendarDate(events);
  const gameEndDate = lastCalendarDate(events);

  // --- V: Derive Attendance ---
  const party = selectParty(events);
  // We don't currently have any way to record guests in the session log, so we don't need to worry about that here.

  // --- VI: Aggregate Raw AP Events
}
