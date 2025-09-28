import { info, usage } from '@skyreach/cli-kit';
import { appendEvent } from '../services/event-log';

import type { Context } from '../types';
import { requireSession } from '../services/general.ts';

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
