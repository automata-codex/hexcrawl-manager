import { error, info, makeExitMapper } from '@skyreach/cli-kit';
import {
  SessionAlreadyAppliedError,
  SessionFingerprintMismatchError,
  SessionIdError,
  SessionLogsNotFoundError,
  SessionReportValidationError,
  assertSessionId,
} from '@skyreach/core';
import {
  DirtyGitError,
  FinalizedLogJsonParseError,
  FinalizedLogsNotFoundError,
} from '@skyreach/data';

import { CliError, CliValidationError, NoChangesError } from '../lib/errors';

import { applyAp } from './apply-ap';
import { ApplyTrailsResult, applyTrails } from './apply-trails';

export type ApplyArgs = {
  sessionId?: string;
  allowDirty?: boolean;
  mode?: ApplyMode;
};

export type ApplyMode = 'all' | 'ap' | 'trails';

export const exitCodeForApply = makeExitMapper(
  [
    [CliValidationError, 4], // user input or file contents are invalid
    [DirtyGitError, 5], // external failure
    [FinalizedLogJsonParseError, 2], // invalid/corrupt input
    [FinalizedLogsNotFoundError, 3], // not found
    [SessionAlreadyAppliedError, 0], // benign no-op
    [NoChangesError, 5], // no-op error
    [SessionFingerprintMismatchError, 4], // conflicting state
    [SessionIdError, 2], // invalid session id or missing context
    [SessionLogsNotFoundError, 4], // domain-specific failure
    [SessionReportValidationError, 2], // usage: schema invalid

    // Keep the most generic types at the end to avoid masking more specific ones
    [CliError, 1], // generic
  ],
  1, // fallback default
);

export function printApplyTrailsResult(res: ApplyTrailsResult) {
  switch (res.status) {
    case 'ok': {
      if (res.kind === 'session') {
        const s = res.summary ?? {};
        info(
          `Session applied: ${res.fileId} (season ${res.seasonId}). ` +
          `created=${s.created ?? 0}, rediscovered=${s.rediscovered ?? 0}, uses=${s.usesFlagged ?? 0}, touched=${s.edgesTouched ?? 0}.`
        );
      } else {
        const s = res.summary ?? {};
        info(
          `Rollover applied: season ${res.seasonId}. ` +
          `maintained=${s.maintained ?? 0}, persisted=${s.persisted ?? 0}, deleted=${s.deletedTrails ?? 0}, touched=${s.edgesTouched ?? 0}.`
        );
      }
      break;
    }

    case 'already-applied':
      info(res.message ?? 'Already applied.');
      break;

    case 'no-op':
      info(res.message ?? 'No changes would be made.');
      break;

    case 'validation-error':
    case 'unrecognized-file':
      error(res.message ?? 'Validation error.');
      break;

    case 'io-error':
      error(res.message ?? 'I/O error during apply.');
      break;
  }
}

export async function apply(args: ApplyArgs) {
  const { allowDirty, mode: rawMode, sessionId: rawId } = args;
  const mode: ApplyMode = rawMode ?? 'all';
  const sessionId = rawId ? assertSessionId(rawId) : undefined;

  try {
    if (mode === 'all' || mode === 'trails') {
      const result = await applyTrails({ allowDirty });
      printApplyTrailsResult(result);
    }

    if (mode === 'all' || mode === 'ap') {
      const result = await applyAp({ sessionId, allowDirty });

      console.log('');
      if (result.alreadyApplied) {
        console.log(`✅ ${result.sessionId} was already applied (no changes made).`);
      } else {
        console.log(`✨ Applied ${result.sessionId}:`);
        console.log(`  • ${result.entriesAppended} ledger entr${result.entriesAppended === 1 ? 'y' : 'ies'} appended`);
        console.log(`  • Report: ${result.reportPath}`);
      }
      console.log('');
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    error(message);
    process.exit(exitCodeForApply(e));
  }
}
