import { PILLARS, TIERS } from '../constants';
import { appendEvent } from '../events';
import { requireSession } from '../guards';
import { deriveCurrentHex } from '../hex';
import { info, usage } from '../report.ts';
import type { Context } from '../types';

export default function ap(ctx: Context) {
  return (args: string[]) => {
    if (!requireSession(ctx)) {
      return;
    }

    const pillar = (args[0] ?? '').toLowerCase();
    const tierStr = args[1];
    const note = (args[2] ?? '').trim();

    const pillars = PILLARS as readonly string[];
    if (!pillar || !pillars.includes(pillar)) {
      usage(`usage: ap <pillar> <tier> <note...>\n  pillars: ${pillars.join(', ')}`);
      return;
    }

    const tiers = TIERS as readonly number[];
    const tier = Number(tierStr);
    if (!tierStr || !Number.isInteger(tier) || !tiers.includes(tier)) {
      usage(`usage: ap <pillar> <tier> <note...>\n  tiers: ${tiers.join(', ')}`);
      return;
    }

    if (!note) {
      return usage('usage: ap <pillar> <tier> <note...>');
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

    info(`✓ ap: ${pillar} (${tier}) — ${note}${hex ? ` @ ${hex}` : ''}`);
  };
}
