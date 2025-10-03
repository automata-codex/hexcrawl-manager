import { info, warn } from '@skyreach/cli-kit';

import { readEvents } from '../../../services/event-log.service';
import { requireFile } from '../services/general';

import type { Context } from '../types';

export default function view(ctx: Context) {
  return (args: string[]) => {
    if (!requireFile(ctx)) {
      return warn('⚠ no session');
    }
    const n = Math.max(1, parseInt(args[0] ?? '10', 10));
    const evs = readEvents(ctx.file!); // Checked by `requireFile`
    for (const e of evs.slice(-n)) {
      info(`#${e.seq} ${e.ts} ${e.kind} ${JSON.stringify(e.payload)}`);
    }
  };
}
