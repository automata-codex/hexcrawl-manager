import { error, makeExitMapper } from '@skyreach/cli-kit';
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

import { CliError } from '../lib/errors';

import { applyAp } from './apply-ap';

export type ApplyArgs = {
  sessionId?: string;
  allowDirty?: boolean;
  mode?: ApplyMode;
};

export type ApplyMode = 'all' | 'ap' | 'trails';

export const exitCodeForApply = makeExitMapper(
  [
    [CliError, 1], // generic
    [DirtyGitError, 5], // external failure
    [FinalizedLogJsonParseError, 2], // invalid/corrupt input
    [FinalizedLogsNotFoundError, 3], // not found
    [SessionAlreadyAppliedError, 0], // benign no-op
    [SessionFingerprintMismatchError, 4], // conflicting state
    [SessionIdError, 2], // invalid session id or missing context
    [SessionLogsNotFoundError, 4], // domain-specific failure
    [SessionReportValidationError, 2], // usage: schema invalid
  ],
  1, // fallback default
);

export async function apply(args: ApplyArgs) {
  const { allowDirty, mode: rawMode, sessionId: rawId } = args;
  const mode: ApplyMode = rawMode ?? 'all';
  const sessionId = rawId ? assertSessionId(rawId) : undefined;

  try {
    if (mode === 'all' || mode === 'trails') {
      throw new CliError('Trails application is not implemented yet.');
    }

    // @ts-expect-error -- TypeScript doesn't like this comparison for some reason
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
