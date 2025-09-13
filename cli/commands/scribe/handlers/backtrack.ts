import { PACES } from '../constants.ts';
import { requireFile, requireSession } from '../lib/guards.ts';
import { info, usage, warn } from '../lib/report.ts';
import { isPartyLost, selectCurrentHex } from '../projector.ts';
import { appendEvent, readEvents } from '../services/event-log';
import type { Context, Pace } from '../types';

/**
 * Finds the previous hex the party occupied before the current one.
 * Traverses the event log backwards, starting from the current hex,
 * and locates the most recent distinct move event that led to the current hex.
 *
 * @param events - Array of event objects (chronological order).
 * @returns An object { from, to } where:
 *   - from: the hex the party is currently in
 *   - to: the hex the party will backtrack to (the previous hex)
 *   Returns null if there is no previous hex to backtrack to.
 */
function findPreviousHex(events: any[]): { from: string, to: string } | null {
  // Traverse backwards to find the most recent distinct move
  let lastMove = null;
  let currentHex = selectCurrentHex(events);
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'move' && e.payload && e.payload.to && e.payload.from) {
      if (e.payload.to === currentHex) {
        // Found the move that got us to currentHex
        lastMove = e;
        currentHex = e.payload.from;
      } else if (lastMove) {
        // Found the previous distinct move
        return { from: lastMove.payload.to, to: lastMove.payload.from };
      }
    }
  }
  // If we only found one move, return its from/to
  if (lastMove) {
    return { from: lastMove.payload.to, to: lastMove.payload.from };
  }
  return null;
}

export default function backtrack(ctx: Context) {
  return (args: string[]) => {
    if (!requireFile(ctx)) {
      return;
    }
    if (!requireSession(ctx)) {
      return;
    }

    // Parse pace
    let pace: Pace = 'normal';
    if (args.length > 1) {
      return usage('usage: backtrack [slow|normal]');
    }
    if (args[0]) {
      const arg = args[0].toLowerCase();
      if (!PACES.includes(arg) || arg === 'fast') {
        return usage('usage: backtrack [slow|normal]');
      }
      pace = arg as Pace;
    }

    const events = readEvents(ctx.file!); // Checked by `requireFile`
    const isLost = isPartyLost(events);
    const prev = findPreviousHex(events);

    if (!prev) {
      warn('Cannot backtrack—no previous hex.');
      return;
    }

    // Always emit attempt event
    appendEvent(ctx.file!, 'backtrack', { pace }); // Checked by `requireFile`

    if (isLost) {
      appendEvent(ctx.file!, 'lost', { state: 'off', method: 'backtrack' }); // Checked by `requireFile`
      info(`Backtracking (${pace} pace). Regained bearings. Moved to ${prev.to}.`);
    } else {
      info(`Backtracking (${pace} pace). Moved to ${prev.to}.`);
    }

    appendEvent(ctx.file!, 'move', { from: prev.from, to: prev.to, pace }); // Checked by `requireFile`
  };
}
