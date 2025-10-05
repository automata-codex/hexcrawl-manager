import { error, info, usage } from '@skyreach/cli-kit';
import { isValidHexId, normalizeHexId } from '@skyreach/core';
import { existsSync } from 'node:fs';

import { appendEvent, readEvents } from '../../../services/event-log.service';
import { selectCurrentHex } from '../projectors';
import { detectDevMode } from '../services/general';
import { prepareSessionStart } from '../services/session';

import type { Context } from '../types';

export default function start(ctx: Context) {
  return (args: string[]) => {
    // Remove --dev if present
    const filteredArgs = args.filter((a) => a !== '--dev');
    const devMode = detectDevMode(args);
    const now = new Date();

    // Step 1: Argument Parsing
    if (filteredArgs.length !== 1) {
      usage('usage:\n  start <hex>\n  start interactive');
      return;
    }

    const arg = filteredArgs[0];
    if (arg === 'interactive') {
      // Step 2: Dev Mode Handling for interactive
      if (devMode) {
        error('`start interactive` is unavailable in dev mode.');
        return;
      }
      // Placeholder for interactive flow
      info('Interactive session start is not yet implemented.');
      return;
    }

    // ...existing code for start <HEX>...
    if (!arg || !isValidHexId(arg)) {
      error('❌ Invalid hex. Example: `start P13`');
      return;
    }
    const startHexNorm = normalizeHexId(arg);

    // Prepare session (ID, file, lock, etc) -- always auto-generate sessionId
    const prep = prepareSessionStart({
      devMode,
      date: now,
    });
    if (!prep.ok) {
      error(prep.error);
      return;
    }
    ctx.sessionId = prep.sessionId;
    ctx.file = prep.inProgressFile;

    // Step 3: Enforce sessionId/filename conventions and handle lock files
    // Extract sessionDate from filename (for event)
    let sessionDate = '';
    let sessionSeq = '';
    let lockPath = '';
    let filenameStem = '';
    if (devMode) {
      // Dev mode: sessionId = filename stem = dev_<ISO>
      filenameStem = prep.sessionId;
      sessionDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
    } else {
      // Production: session_<SEQ>_<YYYY-MM-DD>
      const match = prep.sessionId.match(/^session_(\d{4,})_(\d{4}-\d{2}-\d{2})$/);
      if (!match) {
        error('Session ID does not match required production format.');
        return;
      }
      sessionSeq = match[1];
      sessionDate = match[2];
      filenameStem = `session_${sessionSeq}_${sessionDate}`;
      // Lock file path
      lockPath = `data/session-logs/.locks/session_${sessionSeq}.lock`;
      // Check for lock file
      if (existsSync(lockPath)) {
        error(`Lock file exists for session sequence ${sessionSeq}: ${lockPath}\nActive session in progress. Aborting.`);
        return;
      }
      // Create lock file with metadata
      const lockMeta = {
        seq: Number(sessionSeq),
        filename: `${filenameStem}.jsonl`,
        createdAt: new Date().toISOString(),
        pid: process.pid,
      };
      try {
        require('fs').writeFileSync(lockPath, JSON.stringify(lockMeta, null, 2));
      } catch (e) {
        error(`Failed to create lock file: ${e}`);
        return;
      }
    }

    // Ensure sessionId matches filename stem
    if (!ctx.file.includes(filenameStem)) {
      error('Session file path does not match sessionId stem. Aborting.');
      return;
    }

    // Step 5: Write or resume session_start event
    if (!existsSync(ctx.file)) {
      appendEvent(ctx.file, 'session_start', {
        status: 'in-progress',
        id: prep.sessionId,
        startHex: startHexNorm,
        sessionDate,
      });
      info(`started: ${prep.sessionId} @ ${startHexNorm}`);
    } else {
      const evs = readEvents(ctx.file);
      const lastHex = selectCurrentHex(evs) ?? startHexNorm;
      info(
        `resumed: ${prep.sessionId} (${evs.length} events)${lastHex ? ` — last hex ${lastHex}` : ''}`,
      );
    }
  };
}
