import { error, makeExitMapper } from '@skyreach/cli-kit';
import {
  SessionAlreadyAppliedError,
  SessionFingerprintMismatchError,
  SessionIdError,
  SessionLogsNotFoundError,
  SessionReportValidationError,
} from '@skyreach/core';
import { DirtyGitError } from '@skyreach/data';

import { CliError } from '../lib/errors';

import { applyAp } from './apply-ap';

export const exitCodeForApply = makeExitMapper(
  [
    [CliError, 1],                 // generic
    [DirtyGitError, 5],            // external failure
    [SessionAlreadyAppliedError, 0], // benign no-op
    [SessionFingerprintMismatchError, 4], // conflicting state
    [SessionIdError, 2],           // invalid session id or missing context
    [SessionLogsNotFoundError, 4], // domain-specific failure
    [SessionReportValidationError, 2], // usage: schema invalid
  ],
  1 // fallback default
);

// TODO Wire this into the Commander bit that calls handlers
export async function apply(opts: {}) {
  // TODO Process opts, figure out what to do
  try {
    // eslint-disable-next-line no-unused-vars
    const result = await applyAp(opts);
    // TODO print success
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    error(message);
    process.exit(exitCodeForApply(e));
  }
}
