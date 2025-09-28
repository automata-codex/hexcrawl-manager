import { info, error as printError, warn } from '@skyreach/cli-kit';
import * as fs from 'fs';
import * as path from 'path';


import {
  detectDevMode,
  requireFile,
  requireSession,
} from '../services/general.ts';

import type { Context } from '../types.ts';

// Lock file helpers
const lockDir = path.join('data', 'session-logs', '.locks');
const lockFileName = (sessionId: string) => `session_${sessionId}.lock`;
const lockFilePath = (sessionId: string) =>
  path.join(lockDir, lockFileName(sessionId));

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
      const lockPath = lockFilePath(ctx.sessionId!); // Checked by `requireSession`
      if (!fs.existsSync(lockPath)) {
        printError(`No lock file found for session: ${ctx.sessionId!}`); // Checked by `requireSession`
        return;
      }
      // Try to delete lock file
      try {
        fs.unlinkSync(lockPath);
      } catch (e) {
        warn(`Failed to delete lock file: ${lockPath} (${e})`);
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
