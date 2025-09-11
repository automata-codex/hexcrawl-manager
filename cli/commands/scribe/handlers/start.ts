import { existsSync } from 'node:fs';
import { normalizeHex, lastHexFromEvents, isHexId } from '../hex';
import { error, info, usage } from '../report.ts';
import { inProgressPathFor } from '../services/session.ts';
import { appendEvent, readEvents } from '../services/event-log.ts';
import type { Context } from '../types';

export default function start(ctx: Context, presetSessionId?: string) {
  const doStart = (id: string, startHex: string) => {
    const startHexNorm = normalizeHex(startHex);
    ctx.sessionId = id;
    ctx.file = inProgressPathFor(id);

    if (!isHexId(startHexNorm)) {
      error(`❌ Invalid starting hex: ${startHex}`);
      return;
    }

    if (!existsSync(ctx.file)) {
      ctx.lastHex = startHexNorm;
      appendEvent(ctx.file, 'session_start', { status: 'in-progress', id, startHex: startHexNorm });
      info(`started: ${id} @ ${startHexNorm}`);
    } else {
      const evs = readEvents(ctx.file);
      ctx.lastHex = lastHexFromEvents(evs) ?? startHexNorm;
      info(`resumed: ${id} (${evs.length} events)`);
    }
  };

  return (args: string[]) => {
    if (args.length === 0) {
      usage('usage:\n  start <hex>\n  start <sessionId> <hex>');
      return;
    }
    if (args.length === 1) {
      const hex = args[0];
      if (!isHexId(hex)) {
        error('❌ Invalid hex. Example: `start P13` or `start session-19 P13`');
        return;
      }
      const id = presetSessionId ?? new Date().toISOString().slice(0,10);
      doStart(id, hex);
      return;
    }
    const [id, hex] = args;
    if (!isHexId(hex)) {
      error('❌ Invalid hex. Example: `start P13` or `start session-19 P13`');
      return;
    }
    doStart(id, hex);
  };
}
