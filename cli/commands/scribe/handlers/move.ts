import { requireSession } from '../lib/guards.ts';
import { isHexId, normalizeHex } from '../lib/hex.ts';
import { error, info, usage, warn } from '../lib/report.ts';
import { selectCurrentHex } from '../projector.ts';
import { appendEvent, readEvents } from '../services/event-log';
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
    const events = ctx.file ? readEvents(ctx.file) : [];
    const from = selectCurrentHex(events);
    if (!from) {
      warn('(note) starting move has no previous hex');
    }
    appendEvent(ctx.file!, 'move', { from, to, pace });
    info(`→ move to ${to}${from ? ` (from ${from})` : ''} [${pace}]`);
  };
}
