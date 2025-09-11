import { requireSession } from '../lib/guards.ts';
import { info, usage } from '../lib/report.ts';
import { appendEvent } from '../services/event-log';
import type { Context } from '../types';

export default function note(ctx: Context) {
  return (args: string[]) => {
    if (!requireSession(ctx)) {
      return;
    }
    const text = args.join(' ');
    if (!text) {
      return usage('usage: note <text…>');
    }
    appendEvent(ctx.file!, 'note', { text, scope: 'session' });
    info(`  note added`);
  };
}
