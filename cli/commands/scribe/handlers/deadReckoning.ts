import { usage, info } from '../lib/report';
import { requireFile } from '../lib/guards.ts';
import { isPartyLost } from '../projectors.ts';
import { readEvents, appendEvent } from '../services/event-log';
import type { Context } from '../types';

export default function deadReckoning(ctx: Context) {
  return (args: string[]) => {
    if (!requireFile(ctx)) {
      return;
    }
    const outcome = (args[0] || '').toLowerCase();
    if (outcome !== 'success' && outcome !== 'fail') {
      return usage('usage: dead-rec <success|fail>');
    }
    const events = readEvents(ctx.file!); // Checked by `requireFile`
    appendEvent(ctx.file!, 'dead_reckoning', { outcome }); // Checked by `requireFile`
    if (outcome === 'success' && isPartyLost(events)) {
      appendEvent(ctx.file!, 'lost', { state: 'off', method: 'dead-reckoning' }); // Checked by `requireFile`
      return info('Dead reckoning succeeded. Lost state: OFF.');
    }
    if (outcome === 'success') {
      return info('Dead reckoning succeeded.');
    }
    return info('Dead reckoning failed.');
  };
}

