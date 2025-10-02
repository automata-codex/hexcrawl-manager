import { error, info, warn } from '@skyreach/cli-kit';
import { existsSync } from 'node:fs';

import { selectCurrentHex } from '../projectors.ts';
import { readEvents } from '../../../src/services/event-log.ts';
import { detectDevMode } from '../services/general.ts';
import {
  findLatestInProgress,
  inProgressPathFor,
} from '../services/session.ts';

import type { Context } from '../types';

export default function resume(ctx: Context) {
  return (args: string[]) => {
    let sessionId: string | undefined;
    let filePath: string | undefined;
    const devMode = detectDevMode(args);
    const filteredArgs = args.filter((a) => a !== '--dev'); // Remove --dev if present
    if (filteredArgs[0]) {
      sessionId = filteredArgs[0];
      filePath = inProgressPathFor(sessionId, devMode);
      if (!existsSync(filePath)) {
        error(`❌ No in-progress log for '${sessionId}' at ${filePath}`);
        return;
      }
    } else {
      const latest = findLatestInProgress();
      if (!latest) {
        warn('∅ No in-progress sessions found. Use: start <hex>');
        return;
      }
      sessionId = latest.id;
      filePath = latest.path;
    }
    ctx.sessionId = sessionId;
    ctx.file = filePath;
    const evs = readEvents(filePath);
    const lastHex = selectCurrentHex(evs);
    info(
      `resumed: ${sessionId} (${evs.length} events)${lastHex ? ` — last hex ${lastHex}` : ''}`,
    );
  };
}
