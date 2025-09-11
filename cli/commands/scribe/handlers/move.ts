import { appendEvent } from '../events';
import { requireSession } from '../guards';
import { isHexId, normalizeHex } from '../hex';
import { error, info, usage, warn } from '../report.ts';
import type { Context, Pace } from '../types';

export default function move(ctx: Context) {
  return (args: string[]) => {
    if (!requireSession(ctx)) {
      return;
    }
    const toRaw = (args[0] ?? '');
    if (!toRaw) {
      return usage('usage: move <to> [pace]');
    }
    const to = normalizeHex(toRaw);
    if (!isHexId(to)) {
      return error('❌ Invalid hex id');
    }
    const pace = (args[1] ?? 'normal') as Pace;
    const from = ctx.lastHex ?? null;
    if (!from) {
      warn('(note) starting move has no previous hex');
    }
    appendEvent(ctx.file!, 'move', { from, to, pace });
    ctx.lastHex = to;
    info(`→ move to ${to}${from ? ` (from ${from})` : ''} [${pace}]`);
  };
}
