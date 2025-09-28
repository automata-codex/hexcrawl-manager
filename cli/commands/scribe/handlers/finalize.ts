import { info, error as printError } from '@skyreach/cli-kit';

import {
  detectDevMode,
  requireFile,
  requireSession,
} from '../services/general.ts';
import { finalizeSession } from '../services/session.ts';

import type { Context } from '../types';

export default function finalize(ctx: Context) {
  return (args: string[]) => {
    if (!requireSession(ctx)) {
      return;
    }
    if (!requireFile(ctx)) {
      return;
    }
    const devMode = detectDevMode(args);
    const result = finalizeSession(ctx, devMode);
    if (result.error) {
      printError(result.error);
      return;
    }
    for (const out of result.outputs) {
      info(`✔ finalized → ${out}`);
    }
    for (const roll of result.rollovers) {
      info(`✔ rollover → ${roll}`);
    }
  };
}
