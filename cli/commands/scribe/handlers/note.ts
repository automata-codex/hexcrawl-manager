import type { Context } from '../types';
import { appendEvent } from '../events';

export default function note(ctx: Context) {
  return (args: string[]) => {
    if (!ctx.sessionId) {
      return console.log('⚠ start a session first');
    }
    const text = args.join(' ');
    if (!text) {
      return console.log('usage: note <text…>');
    }
    appendEvent(ctx.file!, 'note', { text, scope: 'session' });
    console.log(`  note added`);
  };
}
