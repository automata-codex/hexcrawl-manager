import { error, info, usage, warn } from '@skyreach/cli-kit';
import { isValidHexId, normalizeHexId } from '@skyreach/core';

import { appendEvent, readEvents } from '../../../services/event-log.service';
import { selectCurrentHex } from '../projectors';
import { requireFile, requireSession } from '../services/general';

import type { Context } from '../types';

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

    const other = normalizeHexId(otherRaw);
    if (!isValidHexId(other)) {
      return error('❌ Invalid hex. Example: trail P14');
    }

    const events = readEvents(ctx.file!); // Checked by `requireFile`
    const current = selectCurrentHex(events);
    if (!current) {
      return warn(
        '⚠ no current hex known—make a move or start with a starting hex first',
      );
    }
    const from = normalizeHexId(current);
    if (from === other) {
      return error('❌ Cannot mark a trail to the same hex');
    }

    appendEvent(ctx.file!, 'trail', { from, to: other, marked: true });
    info(`✓ marked trail ${from} ↔ ${other}`);
  };
}
