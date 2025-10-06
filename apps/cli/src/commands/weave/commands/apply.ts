import { error, makeExitMapper } from '@skyreach/cli-kit';
import { SessionIdError, SessionLogsNotFoundError } from '@skyreach/core';
import { DirtyGitError } from '@skyreach/data';

import { CliError } from '../lib/errors';

import { applyAp } from './apply-ap';

export const exitCodeForApply = makeExitMapper(
  [
    [CliError, 1],                 // generic
    [SessionIdError, 2],           // invalid session id or missing context
    [SessionLogsNotFoundError, 4], // domain-specific failure
    [DirtyGitError, 5],            // external failure
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
