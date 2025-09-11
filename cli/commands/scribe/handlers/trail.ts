import { HEX_RE } from '../constants';
import { appendEvent } from '../events';
import { requireCurrentHex, requireSession } from '../guards.ts';
import { normalizeHex } from '../hex';
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
      return console.log('usage: trail <hex>');
    }

    const other = normalizeHex(otherRaw);
    if (!HEX_RE.test(other)) {
      return console.log('❌ Invalid hex. Example: trail P14');
    }

    const from = normalizeHex(ctx.lastHex!); // Checked by `requireCurrentHex`
    if (from === other) {
      return console.log('❌ Cannot mark a trail to the same hex');
    }

    appendEvent(ctx.file!, 'trail', { from, to: other, marked: true });
    console.log(`✓ marked trail ${from} ↔ ${other}`);
  };
}
