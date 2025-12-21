import { error, info, usage } from '@achm/cli-kit';

import { appendEvent, readEvents } from '../../../services/event-log.service';
import { selectCurrentHex } from '../../../services/projectors.service';
import { requireFile, requireSession } from '../services/general';

import type { Context } from '../types';

export default function explore(ctx: Context) {
  return (args: string[]) => {
    if (!requireFile(ctx)) {
      return;
    }
    if (!requireSession(ctx)) {
      return;
    }
    if (args.length > 0) {
      return usage('usage: explore');
    }

    const events = readEvents(ctx.file!); // Checked by `requireFile`
    const target = selectCurrentHex(events);
    if (!target) {
      return error('❌ No current hex available. Start a session first.');
    }

    // Emit explore event
    appendEvent(ctx.file!, 'explore', {
      target,
    });

    // CLI output
    info(`Explored ${target}: hidden sites revealed.`);
  };
}
