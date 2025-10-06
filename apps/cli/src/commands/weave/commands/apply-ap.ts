import {
  assertSessionId,
  SessionAlreadyAppliedError,
  SessionFingerprintMismatchError,
  SessionReportValidationError,
} from '@skyreach/core';
import { REPO_PATHS } from '@skyreach/data';
import { SessionReportSchema } from '@skyreach/schemas';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { ZodError } from 'zod';

import {
  discoverFinalizedScribeLogs,
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

  // --- Get a Valid Session ID ---
  if (opts.sessionId) {
    // Validate Session ID Format
    assertSessionId(opts.sessionId);
    const sessionNum = opts.sessionId.split('-')[1]; // TODO Rename this is sessionNumStr
    const allFiles = discoverFinalizedScribeLogs(sessionNum);
    if (allFiles.length === 0) {
      throw new Error(`No finalized logs for ${opts.sessionId}.`);
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
          throw new SessionReportValidationError(opts.sessionId, err.issues);
        }
        throw new Error(`Failed to parse report for ${opts.sessionId}: ${err}`);
      }
      createdAt = reportYaml.createdAt ?? '';

      // Check for Planned Report and Dirty Git
      if (reportYaml.status === 'planned') {
        assertCleanGitOrAllowDirty(opts);
      }

      // Check for Existing Completed Report (idempotency Check)
      const fingerprint = getFingerprint(opts.sessionId, scribeIds);
      const reportFingerprint =
        reportYaml.status === 'completed' ? reportYaml.fingerprint : undefined;
      if (reportFingerprint === fingerprint) {
        throw new SessionAlreadyAppliedError(opts.sessionId);
      }
      if (reportYaml.status !== 'planned') {
        throw new SessionFingerprintMismatchError(opts.sessionId);
      }
    }
  } else {
    // TODO Coming soon!
  }
}
