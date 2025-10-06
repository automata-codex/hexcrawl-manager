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
};

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
  const { sessionId: rawId, allowDirty } = args;
  const sessionId = rawId ? assertSessionId(rawId) : undefined;

  try {
    // eslint-disable-next-line no-unused-vars
    const result = await applyAp({ sessionId, allowDirty });
    // TODO print success
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    error(message);
    process.exit(exitCodeForApply(e));
  }
}
