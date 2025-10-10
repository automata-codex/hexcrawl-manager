import { usage, info } from '@skyreach/cli-kit';

import { readEvents, appendEvent } from '../../../services/event-log.service';
import { isPartyLost } from '../projectors';
import { requireFile } from '../services/general';

import type { Context } from '../types';

export default function deadReckoning(ctx: Context) {
  return (args: string[]) => {
    if (!requireFile(ctx)) {
      return;
    }
    const outcome = (args[0] || '').toLowerCase();
    if (outcome !== 'success' && outcome !== 'failure') {
      return usage('usage: dead-rec <success|fail>');
    }
    const events = readEvents(ctx.file!); // Checked by `requireFile`
    appendEvent(ctx.file!, 'dead_reckoning', { outcome }); // Checked by `requireFile`
    if (outcome === 'success' && isPartyLost(events)) {
      appendEvent(ctx.file!, 'lost', {
        state: 'off',
        reason: 'dead-reckoning',
      }); // Checked by `requireFile`
      return info('Dead reckoning succeeded. Lost state: OFF.');
    }
    if (outcome === 'success') {
      return info('Dead reckoning succeeded.');
    }
    return info('Dead reckoning failed.');
  };
}
