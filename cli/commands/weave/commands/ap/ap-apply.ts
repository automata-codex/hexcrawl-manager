import crypto from 'crypto';
import fs from 'fs';
import { glob } from 'glob';
import path from 'path';
import yaml from 'yaml';

import { getRepoPath } from '../../../../../lib/repo';
import pkg from '../../../../../package.json' assert { type: 'json' };
import { SessionReportSchema } from '../../../../../schemas/session-report.js';
import { firstCalendarDate, lastCalendarDate, selectParty } from '../../../scribe/projectors.ts';
import { eventsOf, writeYamlAtomic } from '../../../shared-lib';
import { REPO_PATHS } from '../../../shared-lib/constants';
import { isGitDirty } from '../../../shared-lib/git.ts';
import { pickNextSessionId } from '../../../shared-lib/pick-next-session-id';
import { sortScribeIds } from '../../../shared-lib/sort-scribe-ids';
import { computeApForSession } from '../../lib/compute-ap-for-session.ts';

function getFingerprint(sessionId: string, scribeIds: string[]): string {
  const fingerprintObj = { sessionId, scribeIds };
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(fingerprintObj))
    .digest('hex');
}

export async function apApply(sessionId?: string) {
  let createdAt: string = '';

  // --- Get a Valid Session ID ---
  if (sessionId) {
    // Validate Session ID Format
    if (!/^session-\d{4}$/.test(sessionId)) {
      throw new Error(`Invalid sessionId format: ${sessionId}. Expected format is session-####.`);
    }
    const sessionNum = sessionId.split('-')[1];
    const sessionsDir = REPO_PATHS.SESSIONS();

    // Discover Finalized Scribe Logs
    const pattern1 = path.join(sessionsDir, `session_${sessionNum}_*.jsonl`);
    const pattern2 = path.join(sessionsDir, `session_${sessionNum}[a-z]_*.jsonl`);
    const files1 = glob.sync(pattern1);
    const files2 = glob.sync(pattern2);
    const allFiles = Array.from(new Set([...files1, ...files2]));
    if (allFiles.length === 0) {
      throw new Error(`No finalized logs for ${sessionId}.`);
    }

    // Sort Scribe IDs
    const unsortedScribeIds = allFiles.map(f => path.basename(f, '.jsonl'));
    const scribeIds = sortScribeIds(unsortedScribeIds);

    // Compute Fingerprint as hash
    const fingerprint = getFingerprint(sessionId, scribeIds);

    const reportPath = path.join(REPO_PATHS.REPORTS(), `session-${sessionNum}.yaml`);
    if (fs.existsSync(reportPath)) {
      const reportContent = fs.readFileSync(reportPath, 'utf8');
      let reportYaml;
      try {
        const reportYamlRaw = yaml.parse(reportContent);
        reportYaml = SessionReportSchema.parse(reportYamlRaw);
      } catch (err) {
        throw new Error(`Failed to parse report for ${sessionId}: ${err}`);
      }
      createdAt = reportYaml.createdAt ?? '';

      // Check for Planned Report and Dirty Git
      if (reportYaml?.status === 'planned') {
        if (isGitDirty()) {
          throw new Error(`Planned report exists for ${sessionId}, but the working tree is dirty. Commit or stash changes, then re-run.`);
        }
      }

      // Check for Existing Completed Report (idempotency Check)
      const reportFingerprint = reportYaml.status === 'completed' ? reportYaml.fingerprint : undefined;
      if (typeof reportFingerprint === 'string' && reportFingerprint === fingerprint) {
        console.log(`Completed report for ${sessionId} already matches fingerprint. No-op.`);
        return;
      } else if (reportYaml?.status !== 'planned') {
        throw new Error(`Completed report for ${sessionId} has a different fingerprint. Revert the prior apply or use a new session.`);
      }
    }
  } else {
    // Discover finalized session logs
    const logFiles = fs.readdirSync(REPO_PATHS.SESSIONS()).filter(f => f.match(/^session_\d{4}[a-z]?_\d{4}-\d{2}-\d{2}\.jsonl$/));
    const sessionNumbers = logFiles.map(f => {
      const matches = f.match(/^session_(\d{4})/);
      if (!matches) {
        throw new Error(`Unexpected filename format: ${f}`);
      }
      return parseInt(matches[1], 10);
    });

    // Identify pending sessions
    const reportFiles = fs.existsSync(REPO_PATHS.REPORTS()) ? fs.readdirSync(REPO_PATHS.REPORTS()) : [];
    const completedSessions = reportFiles
      .filter(f => f.match(/^session-\d{4}\.yaml$/))
      .map(f => f.match(/^session-(\d{4})\.yaml$/)![1])
      .map(f => parseInt(f, 10));
    const pendingSessions = sessionNumbers.filter(num => !completedSessions.includes(num));

    // Pick the next session to apply
    if (pendingSessions.length === 0) {
      throw new Error('No pending sessions with finalized logs found.');
    }
    sessionId = pickNextSessionId(completedSessions, pendingSessions);
  }

  const sessionNum = parseInt(sessionId.split('-')[1], 10);

  // --- Discover Scribe IDs (Finalized Logs) ---
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

  // --- Parse All Parts ---
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

  // --- Derive Session Fields ---
  const gameStartDate = firstCalendarDate(events);
  const gameEndDate = lastCalendarDate(events);
  const notes = eventsOf(events, 'note').map(e => e.payload.text);
  const sessionDate = events[0].ts.slice(0, 10); // YYYY-MM-DD from first event timestamp; `finalize` guarantees ordering

  // --- Derive Attendance ---
  const party = selectParty(events);
  // We don't currently have any way to record guests in the session log, so we don't need to worry about that here.

  // --- Build characterLevels map ---
  const characterLevels: Record<string, number> = {};
  for (const characterId of party) {
    let level = 1;
    try {
      const charPath = path.join(REPO_PATHS.CHARACTERS(), `${characterId}.yml`);
      if (fs.existsSync(charPath)) {
        const charYaml = yaml.parse(fs.readFileSync(charPath, 'utf8'));
        if (typeof charYaml.level === 'number') level = charYaml.level;
      }
    } catch {
      level = 1;
    }
    characterLevels[characterId] = level;
  }

  // --- Compute AP results ---
  const { reportAdvancementPoints, ledgerResults } = computeApForSession(
    eventsOf(events, 'advancement_point'),
    characterLevels,
    sessionNum
  );

  // --- Write Outputs ---
  // Write completed session report
  const fingerprint = getFingerprint(sessionId, scribeIds);
  const now = new Date().toISOString();
  const reportOut = {
    id: sessionId,
    advancementPoints: reportAdvancementPoints,
    characterIds: party, // Eventually we'll want to include guests here
    fingerprint,
    gameEndDate,
    gameStartDate,
    notes,
    schemaVersion: 2,
    scribeIds,
    sessionDate,
    source: 'scribe',
    status: 'completed',
    weave: {
      appliedAt: now,
      version: pkg.version,
    },
    createdAt: createdAt.length === 0 ? now : createdAt,
    updatedAt: now,
  };
  const reportPath = path.join(REPO_PATHS.REPORTS(), `session-${sessionNum.toString().padStart(4, '0')}.yaml`);
  writeYamlAtomic(reportPath, reportOut);

  // Append per-character session_ap entries to the ledger
  const ledgerPath = getRepoPath('data', 'ap-ledger.yaml');
  let ledger = [];
  if (fs.existsSync(ledgerPath)) {
    ledger = yaml.parse(fs.readFileSync(ledgerPath, 'utf8')) || [];
  }
  for (const characterId of Object.keys(ledgerResults)) {
    const ap = ledgerResults[characterId];
    ledger.push({
      kind: 'session_ap',
      advancementPoints: {
        combat: { delta: ap.combat.delta, reason: ap.combat.reason },
        exploration: { delta: ap.exploration.delta, reason: ap.exploration.reason },
        social: { delta: ap.social.delta, reason: ap.social.reason },
      },
      appliedAt: now,
      characterId,
      sessionId,
      source: fingerprint,
    });
  }
  writeYamlAtomic(ledgerPath, ledger);
}
