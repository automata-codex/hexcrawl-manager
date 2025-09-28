import { isValidHexId, normalizeHexId } from '@skyreach/core';
import { existsSync } from 'node:fs';

import { error, info, usage } from '@skyreach/cli-kit';
import { selectCurrentHex } from '../projectors.ts';
import { appendEvent, readEvents } from '../services/event-log.ts';
import { prepareSessionStart } from '../services/session.ts';

import type { Context } from '../types';
import { detectDevMode } from '../services/general.ts';

export default function start(ctx: Context) {
  return (args: string[]) => {
    // Remove --dev if present
    const filteredArgs = args.filter((a) => a !== '--dev');
    const devMode = detectDevMode(args);
    const now = new Date();

    if (filteredArgs.length !== 1) {
      usage('usage:\n  start <hex>');
      return;
    }

    const hex = filteredArgs[0];
    if (!hex || !isValidHexId(hex)) {
      error('❌ Invalid hex. Example: `start P13`');
      return;
    }
    const startHexNorm = normalizeHexId(hex);

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

    if (!existsSync(ctx.file)) {
      appendEvent(ctx.file, 'session_start', {
        status: 'in-progress',
        id: prep.sessionId,
        startHex: startHexNorm,
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
