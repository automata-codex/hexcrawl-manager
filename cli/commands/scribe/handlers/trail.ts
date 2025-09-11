import { appendEvent } from '../events';
import { requireCurrentHex, requireSession } from '../guards';
import { isHexId, normalizeHex } from '../hex';
import { error, info, usage } from '../report.ts';
import type { Context } from '../types';

export default function trail(ctx: Context) {
  return (args: string[]) => {
    if (!requireSession(ctx)) {
      return;
    }
    if (!requireCurrentHex(ctx)) {
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

    const from = normalizeHex(ctx.lastHex!); // Checked by `requireCurrentHex`
    if (from === other) {
      return error('❌ Cannot mark a trail to the same hex');
    }

    appendEvent(ctx.file!, 'trail', { from, to: other, marked: true });
    info(`✓ marked trail ${from} ↔ ${other}`);
  };
}
