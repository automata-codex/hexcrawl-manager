import { info, usage } from '@skyreach/cli-kit';

import { appendEvent } from '../../../services/event-log.service';
import { requireSession } from '../services/general';

import type { Context } from '../types';

export default function todo(ctx: Context) {
  return (args: string[]) => {
    if (!requireSession(ctx)) {
      return;
    }
    const text = args.join(' ');
    if (!text) {
      return usage('usage: todo <text…>');
    }
    appendEvent(ctx.file!, 'todo', { text });
    info(`  todo added`);
  };
}
