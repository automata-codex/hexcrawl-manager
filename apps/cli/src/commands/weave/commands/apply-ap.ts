import {
  assertSessionId,
  SessionAlreadyAppliedError,
  SessionFingerprintMismatchError,
  SessionReportValidationError,
} from '@skyreach/core';
import { discoverFinalizedLogs, REPO_PATHS } from '@skyreach/data';
import { SessionReportSchema } from '@skyreach/schemas';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { ZodError } from 'zod';

import {
  discoverFinalizedScribeLogs,
  pickNextSessionId,
  sortScribeIds,
} from '../../../services/sessions.service';
import { assertCleanGitOrAllowDirty } from '../lib/files';

interface ApplyApOptions {
  allowDirty?: boolean;
  sessionId?: string;
}

interface ApplyApResult {
  sessionId: string;          // the session actually applied
  reportPath: string;         // where the report was (re)written
  entriesAppended: number;    // how many AP ledger entries were appended
  alreadyApplied: boolean;    // true if no-op due to matching fingerprint
}

// TODO rename this to `calcFingerprint`
function getFingerprint(sessionId: string, scribeIds: string[]): string {
  const fingerprintObj = { sessionId, scribeIds };
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
    const sessionNum = sessionId.split('-')[1]; // TODO Rename this to sessionNumStr or paddedSessionNum
    const allFiles = discoverFinalizedScribeLogs(sessionNum);
    if (allFiles.length === 0) {
      throw new Error(`No finalized logs for ${sessionId}.`);
    }

    // Sort Scribe IDs
    const unsortedScribeIds = allFiles.map((f) => path.basename(f, '.jsonl'));
    const scribeIds = sortScribeIds(unsortedScribeIds);

    const reportPath = path.join(
      REPO_PATHS.REPORTS(),
      `session-${sessionNum}.yaml`,
    );
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
      const fingerprint = getFingerprint(sessionId, scribeIds);
      const reportFingerprint =
        reportYaml.status === 'completed' ? reportYaml.fingerprint : undefined;
      if (reportFingerprint === fingerprint) {
        throw new SessionAlreadyAppliedError(sessionId);
      }
      if (reportYaml.status !== 'planned') {
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
  // TODO >> Coming soon!
}
