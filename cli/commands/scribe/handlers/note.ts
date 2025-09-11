import type { Context } from '../types';
import { appendEvent } from '../events';
import { requireSession } from '../guards.ts';

export default function note(ctx: Context) {
  return (args: string[]) => {
    if (!requireSession(ctx)) {
      return;
    }
    const text = args.join(' ');
    if (!text) {
      return console.log('usage: note <text…>');
    }
    appendEvent(ctx.file!, 'note', { text, scope: 'session' });
    console.log(`  note added`);
  };
}
