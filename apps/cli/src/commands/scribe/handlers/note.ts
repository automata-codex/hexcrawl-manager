import { info, usage } from '@achm/cli-kit';

import { appendEvent } from '../../../services/event-log.service';
import { requireSession } from '../services/general';

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
