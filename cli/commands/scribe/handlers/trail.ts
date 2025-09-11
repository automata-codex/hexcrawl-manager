import { requireFile, requireSession } from '../guards';
import { isHexId, normalizeHex } from '../hex';
import { selectCurrentHex } from '../projector.ts';
import { error, info, usage, warn } from '../report.ts';
import { appendEvent } from '../services/event-log';
import type { Context } from '../types';
import { getEvents } from './_shared.ts';

export default function trail(ctx: Context) {
  return (args: string[]) => {
    if (!requireSession(ctx)) {
      return;
    }
    if (!requireFile(ctx)) {
      return;
    }

    const otherRaw = args[0];
    if (!otherRaw) {
      return usage('usage: trail <hex>');
    }

    const other = normalizeHex(otherRaw);
    if (!isHexId(other)) {
      return error('❌ Invalid hex. Example: trail P14');
    }

    const events = getEvents(ctx.file!); // Checked by `requireFile`
    const current = selectCurrentHex(events);
    if (!current) {
      return warn('⚠ no current hex known—make a move or start with a starting hex first');
    }
    const from = normalizeHex(current);
    if (from === other) {
      return error('❌ Cannot mark a trail to the same hex');
    }

    appendEvent(ctx.file!, 'trail', { from, to: other, marked: true });
    info(`✓ marked trail ${from} ↔ ${other}`);
  };
}
