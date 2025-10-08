import {
  SessionFingerprintMismatchError,
  SessionReportValidationError,
  assertSessionId,
  formatDate,
  padSessionNum,
} from '@skyreach/core';
import {
  REPO_PATHS,
  discoverFinalizedLogs,
  discoverFinalizedLogsForOrThrow,
  readAllFinalizedLogsForSession,
  writeYamlAtomic,
} from '@skyreach/data';
import { SessionReportSchema } from '@skyreach/schemas';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { ZodError } from 'zod';

import pkg from '../../../../../../package.json' assert { type: 'json' };
import {
  appendApEntries,
  buildSessionApEntries,
} from '../../../services/ap-ledger.service';
import { eventsOf } from '../../../services/event-log.service';
import {
  pickNextSessionId,
  sortScribeIds,
} from '../../../services/sessions.service';
import {
  firstCalendarDate,
  lastCalendarDate,
  selectParty,
} from '../../scribe/projectors';
import { computeApForSession } from '../lib/compute-ap-for-session';
import { assertCleanGitOrAllowDirty } from '../lib/files';

interface ApplyApOptions {
  allowDirty?: boolean;
  sessionId?: string;
}

interface ApplyApResult {
  sessionId: string; // the session actually applied
  reportPath: string; // where the report was (re)written
  entriesAppended: number; // how many AP ledger entries were appended
  alreadyApplied: boolean; // true if no-op due to matching fingerprint
}

function calcFingerprint(sessionId: string, scribeIds: string[]): string {
  const sortedScribeIds = sortScribeIds(scribeIds);
  const fingerprintObj = { sessionId, scribeIds: sortedScribeIds };
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(fingerprintObj))
    .digest('hex');
}

export async function applyAp(opts: ApplyApOptions): Promise<ApplyApResult> {
  let createdAt: string = '';
  let { sessionId } = opts;

  // --- Get a Valid Session ID ---
  if (sessionId) {
    // Validate Session ID Format
    assertSessionId(sessionId);
    const paddedSessionNum = sessionId.split('-')[1];
    const allFiles = discoverFinalizedLogsForOrThrow(paddedSessionNum);

    // Sort Scribe IDs
    const unsortedScribeIds = allFiles.map((file) =>
      path.basename(file.filename, '.jsonl'),
    );
    const scribeIds = sortScribeIds(unsortedScribeIds);

    const reportPath = path.join(
      REPO_PATHS.REPORTS(),
      `session-${padSessionNum(paddedSessionNum)}.yaml`,
    );
    const fingerprint = calcFingerprint(sessionId, scribeIds);
    if (fs.existsSync(reportPath)) {
      const reportContent = fs.readFileSync(reportPath, 'utf8');
      let reportYaml;
      try {
        const reportYamlRaw = yaml.parse(reportContent);
        reportYaml = SessionReportSchema.parse(reportYamlRaw);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new SessionReportValidationError(sessionId, err.issues);
        }
        throw new Error(`Failed to parse report for ${sessionId}: ${err}`);
      }
      createdAt = reportYaml.createdAt ?? '';

      // Check for Planned Report and Dirty Git
      if (reportYaml.status === 'planned') {
        assertCleanGitOrAllowDirty(opts);
      }

      // Check for Existing Completed Report (idempotency Check)
      const existingStatus = reportYaml.status;
      const existingFingerprint =
        existingStatus === 'completed' ? reportYaml.fingerprint : undefined;

      if (existingFingerprint === fingerprint) {
        return {
          sessionId,
          reportPath,
          entriesAppended: 0,
          alreadyApplied: true,
        } satisfies ApplyApResult;
      }

      if (existingStatus && existingStatus !== 'planned') {
        throw new SessionFingerprintMismatchError(sessionId);
      }
    }
  } else {
    // Discover finalized session logs
    const sessionNumbers = discoverFinalizedLogs().map(
      (log) => log.sessionNumber,
    );

    // Identify pending sessions
    const reportFiles = fs.existsSync(REPO_PATHS.REPORTS())
      ? fs.readdirSync(REPO_PATHS.REPORTS())
      : [];
    const completedSessions = reportFiles
      .filter((f) => f.match(/^session-\d{4}\.yaml$/))
      .map((f) => f.match(/^session-(\d{4})\.yaml$/)![1])
      .map((f) => parseInt(f, 10));
    const pendingSessions = sessionNumbers.filter(
      (num) => !completedSessions.includes(num),
    );

    // Pick the next session to apply
    if (pendingSessions.length === 0) {
      throw new Error('No pending sessions with finalized logs found.');
    }
    sessionId = pickNextSessionId(completedSessions, pendingSessions);
  }

  const paddedSessionNum = sessionId.split('-')[1];

  // --- Discover Scribe IDs (Finalized Logs) ---
  const allFiles = discoverFinalizedLogsForOrThrow(paddedSessionNum);

  // Scribe IDs sorted
  const unsortedScribeIds = allFiles.map((file) =>
    path.basename(file.filename, '.jsonl'),
  );
  const scribeIds = sortScribeIds(unsortedScribeIds);

  // --- Parse All Parts ---
  const events = readAllFinalizedLogsForSession(paddedSessionNum);

  // --- Derive Session Fields ---
  const gameStartDate = formatDate(firstCalendarDate(events));
  const gameEndDate = formatDate(lastCalendarDate(events));
  const notes = eventsOf(events, 'note').map((e) => e.payload.text);
  const sessionDate = events[0].ts.slice(0, 10); // YYYY-MM-DD from first event timestamp; `finalize` guarantees ordering

  // --- Derive Attendance ---
  const party = selectParty(events);
  // We don't currently have any way to record guests in the session log, so we don't need to worry about that here.

  // --- Build characterLevels map ---
  const characterLevels: Record<string, number> = {};
  for (const characterId of party) {
    let level = 1;
    try {
      const charPathYaml = path.join(
        REPO_PATHS.CHARACTERS(),
        `${characterId}.yaml`,
      );
      const charPathYml = path.join(
        REPO_PATHS.CHARACTERS(),
        `${characterId}.yml`,
      );
      const charPath = fs.existsSync(charPathYaml) ? charPathYaml : charPathYml;
      if (fs.existsSync(charPath)) {
        const charYaml = yaml.parse(fs.readFileSync(charPath, 'utf8'));
        if (typeof charYaml.level === 'number') {
          level = charYaml.level;
        }
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
    paddedSessionNum,
  );

  // --- Write Outputs & Return Shape ---
  const fingerprint = calcFingerprint(sessionId, scribeIds);

  // Write completed session report
  const reportPath = path.join(
    REPO_PATHS.REPORTS(),
    `session-${padSessionNum(paddedSessionNum)}.yaml`,
  );
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
  writeYamlAtomic(reportPath, reportOut);

  // Append per-character session_ap entries to the ledger
  const entries = buildSessionApEntries(ledgerResults, {
    appliedAt: now,
    sessionId,
    fingerprint,
  });
  appendApEntries(REPO_PATHS.AP_LEDGER(), entries);

  // Return the programmatic result
  return {
    sessionId,
    reportPath,
    entriesAppended: entries.length,
    alreadyApplied: false,
  } satisfies ApplyApResult;
}
