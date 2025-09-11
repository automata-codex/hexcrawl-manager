import { existsSync } from 'node:fs';
import { lastHexFromEvents } from '../hex';
import { findLatestInProgress } from '../in-progress';
import { inProgressPath } from '../lib/session-files';
import { readJsonl } from '../lib/jsonl';
import type { Context } from '../types';
import { error, info, warn } from '../report.ts';

export default function resume(ctx: Context) {
  return (args: string[]) => {
    if (args[0]) {
      const id = args[0];
      const p = inProgressPath(id);
      if (!existsSync(p)) {
        error(`❌ No in-progress log for '${id}' at ${p}`);
        return;
      }
      ctx.sessionId = id;
      ctx.file = p;
      const evs = readJsonl(p);
      ctx.lastHex = lastHexFromEvents(evs);
      info(`resumed: ${id} (${evs.length} events)${ctx.lastHex ? ` — last hex ${ctx.lastHex}` : ''}`);
      return;
    }

    const latest = findLatestInProgress();
    if (!latest) {
      warn('∅ No in-progress sessions found. Use: start <hex>  or  start <sessionId> <hex>');
      return;
    }
    ctx.sessionId = latest.id;
    ctx.file = latest.path;
    const evs = readJsonl(latest.path);
    ctx.lastHex = lastHexFromEvents(evs);
    info(`resumed: ${latest.id} (${evs.length} events)${ctx.lastHex ? ` — last hex ${ctx.lastHex}` : ''}`);
  };
}
