import { ALLOWED_PILLARS, ALLOWED_TIERS } from '../constants';
import { appendEvent } from '../events';
import { requireSession } from '../guards.ts';
import { deriveCurrentHex } from '../hex';
import type { Context } from '../types';

export default function ap(ctx: Context) {
  return (args: string[]) => {
    if (!requireSession(ctx)) {
      return;
    }

    const pillar = (args[0] ?? '').toLowerCase();
    const tierStr = args[1];
    const note = (args[2] ?? '').trim();

    const PILLARS = ALLOWED_PILLARS as readonly string[];
    if (!pillar || !PILLARS.includes(pillar)) {
      console.log(`usage: ap <pillar> <tier> <note...>\n  pillars: ${PILLARS.join(', ')}`);
      return;
    }

    const TIERS = ALLOWED_TIERS as readonly number[];
    const tier = Number(tierStr);
    if (!tierStr || !Number.isInteger(tier) || !TIERS.includes(tier)) {
      console.log(`usage: ap <pillar> <tier> <note...>\n  tiers: ${TIERS.join(', ')}`);
      return;
    }

    if (!note) {
      return console.log('usage: ap <pillar> <tier> <note...>');
    }

    const hex = ctx.lastHex ?? deriveCurrentHex(ctx.file);

    appendEvent(ctx.file!, 'advancement_point', {
      pillar,
      tier,
      note,
      at: {
        hex: hex ?? null,
        party: [...ctx.party],
      }
    });

    console.log(`✓ ap: ${pillar} (${tier}) — ${note}${hex ? ` @ ${hex}` : ''}`);
  };
}
