import { requireFile, requireSession } from '../guards.ts';
import { selectCurrentHex } from '../projector.ts';
import { info } from '../report.ts';
import { readEvents } from '../services/event-log.ts';
import type { Context } from '../types';

export default function current(ctx: Context) {
  return () => {
    if (!requireSession(ctx)) {
      return;
    }
    if (!requireFile(ctx)) {
      return;
    }
    const events = readEvents(ctx.file!); // Checked by `requireFile`
    const hex = selectCurrentHex(events);
    if (!hex) {
      return info('∅ current hex unknown');
    }
    info(hex);
  };
}
