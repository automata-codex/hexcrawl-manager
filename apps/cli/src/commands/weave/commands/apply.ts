import { error } from '@skyreach/cli-kit';
import { SessionIdError } from '@skyreach/core';

import { applyAp } from './apply-ap';

// TODO Wire this into the Commander bit that calls handlers
export async function apply(opts: {}) {
  // TODO Process opts, figure out what to do
  try {
    // eslint-disable-next-line no-unused-vars
    const result = await applyAp(opts);
    // TODO print success
  } catch (e) {
    if (e instanceof SessionIdError) {
      error(e.message);
      process.exit(2); // your “usage/validation” exit code
    }
    // fall back to your generic error handling
    const message = e instanceof Error ? e.message : String(e);
    error(message);
    process.exit(1);
  }
}
