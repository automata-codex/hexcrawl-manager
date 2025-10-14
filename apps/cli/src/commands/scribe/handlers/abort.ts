import { info, error as printError, warn } from '@skyreach/cli-kit';
import { SessionId } from '@skyreach/schemas';
import fs from 'node:fs';

import {
  detectDevMode,
  requireFile,
  requireSession,
} from '../services/general';
import { lockExists, removeLockFile } from '../services/lock-file';

import type { Context } from '../types.ts';

export default function abort(ctx: Context) {
  return (args: string[]) => {
    // Guard: require session and file
    if (!requireSession(ctx)) {
      return;
    }
    if (!requireFile(ctx)) {
      return;
    }

    const devMode = detectDevMode(args);
    let abortOk = true;
    if (!devMode) {
      // Production: require lock file
      if (!lockExists(ctx.sessionId! as SessionId)) { // Checked by `requireSession`
        printError(`No lock file found for session: ${ctx.sessionId!}`); // Checked by `requireSession`
        return;
      }
      // Try to delete lock file
      try {
        removeLockFile(ctx.sessionId! as SessionId); // Checked by `requireSession`
      } catch (e) {
        warn(`Failed to delete lock file for session ${ctx.sessionId!}: (${e})`);
        abortOk = false;
      }
    }

    // Try to delete in-progress file
    try {
      fs.unlinkSync(ctx.file!); // Checked by `requireFile`
    } catch (e) {
      warn(`Failed to delete in-progress file: ${ctx.file!} (${e})`); // Checked by `requireFile`
      abortOk = false;
    }

    if (abortOk) {
      info(`✘ aborted: ${ctx.sessionId!}`); // Checked by `requireSession`
    }
  };
}
