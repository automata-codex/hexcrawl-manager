import { existsSync } from 'node:fs';
import { HEX_RE } from '../constants';
import { appendEvent } from '../events';
import { normalizeHex, lastHexFromEvents } from '../hex';
import { inProgressPath } from '../lib/session-files';
import { readJsonl } from '../lib/jsonl';
import type { Context } from '../types';

export default function start(ctx: Context, presetSessionId?: string) {
  const doStart = (id: string, startHex: string) => {
    const startHexNorm = normalizeHex(startHex);
    ctx.sessionId = id;
    ctx.file = inProgressPath(id);

    if (!HEX_RE.test(startHexNorm)) {
      console.log(`❌ Invalid starting hex: ${startHex}`);
      return;
    }

    if (!existsSync(ctx.file)) {
      ctx.lastHex = startHexNorm;
      appendEvent(ctx.file, 'session_start', { status: 'in-progress', id, startHex: startHexNorm });
      console.log(`started: ${id} @ ${startHexNorm}`);
    } else {
      const evs = readJsonl(ctx.file);
      ctx.lastHex = lastHexFromEvents(evs) ?? startHexNorm;
      console.log(`resumed: ${id} (${evs.length} events)`);
    }
  };

  return (args: string[]) => {
    if (args.length === 0) {
      console.log('usage:\n  start <hex>\n  start <sessionId> <hex>');
      return;
    }
    if (args.length === 1) {
      const hex = args[0];
      if (!HEX_RE.test(hex)) {
        console.log('❌ Invalid hex. Example: `start P13` or `start session-19 P13`');
        return;
      }
      const id = presetSessionId ?? new Date().toISOString().slice(0,10);
      doStart(id, hex);
      return;
    }
    const [id, hex] = args;
    if (!HEX_RE.test(hex)) {
      console.log('❌ Invalid hex. Example: `start P13` or `start session-19 P13`');
      return;
    }
    doStart(id, hex);
  };
}
