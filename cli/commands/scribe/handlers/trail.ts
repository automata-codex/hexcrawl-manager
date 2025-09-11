import type { Context } from '../types';
import { HEX_RE } from '../constants';
import { normalizeHex } from '../hex';
import { appendEvent } from '../events';

export default function trail(ctx: Context) {
  return (args: string[]) => {
    if (!ctx.sessionId) {
      return console.log('⚠ start or resume a session first');
    }
    if (!ctx.lastHex) {
      return console.log('⚠ no current hex known—make a move or start with a starting hex first');
    }

    const otherRaw = args[0];
    if (!otherRaw) {
      return console.log('usage: trail <hex>');
    }

    const other = normalizeHex(otherRaw);
    if (!HEX_RE.test(other)) {
      return console.log('❌ Invalid hex. Example: trail P14');
    }

    const from = normalizeHex(ctx.lastHex);
    if (from === other) {
      return console.log('❌ Cannot mark a trail to the same hex');
    }

    appendEvent(ctx.file!, 'trail', { from, to: other, marked: true });
    console.log(`✓ marked trail ${from} ↔ ${other}`);
  };
}
