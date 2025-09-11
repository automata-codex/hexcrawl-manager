import type { Context } from '../types';
import { HEX_RE } from '../constants';
import { appendEvent } from '../events';

export default function move(ctx: Context) {
  return (args: string[]) => {
    if (!ctx.sessionId) {
      return console.log('⚠ start or resume a session first');
    }
    const to = (args[0] ?? '').toUpperCase();
    if (!to) {
      return console.log('usage: move <to> [pace]');
    }
    if (!HEX_RE.test(to)) {
      return console.log('❌ Invalid hex id');
    }
    const pace = (args[1] ?? 'normal') as 'fast'|'normal'|'slow';
    const from = ctx.lastHex ?? null;
    if (!from) {
      console.log('(note) starting move has no previous hex');
    }
    appendEvent(ctx.file!, 'move', { from, to, pace });
    ctx.lastHex = to;
    console.log(`→ move to ${to}${from ? ` (from ${from})` : ''} [${pace}]`);
  };
}
