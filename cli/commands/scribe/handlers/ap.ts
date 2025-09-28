import { PILLARS, TIERS } from '@skyreach/schemas';

import { info, usage } from '@skyreach/cli-kit';
import { selectCurrentHex, selectParty } from '../projectors.ts';
import { appendEvent, readEvents } from '../services/event-log';

import type { Context } from '../types';
import { requireSession } from '../services/general.ts';

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
      usage(
        `usage: ap <pillar> <tier> <note...>\n  pillars: ${pillars.join(', ')}`,
      );
      return;
    }

    const tiers = TIERS as readonly number[];
    const tier = Number(tierStr);
    if (!tierStr || !Number.isInteger(tier) || !tiers.includes(tier)) {
      usage(
        `usage: ap <pillar> <tier> <note...>\n  tiers: ${tiers.join(', ')}`,
      );
      return;
    }

    if (!note) {
      return usage('usage: ap <pillar> <tier> <note...>');
    }

    const events = ctx.file ? readEvents(ctx.file) : [];
    const hex = selectCurrentHex(events);
    const party = selectParty(events);

    appendEvent(ctx.file!, 'advancement_point', {
      pillar,
      tier,
      note,
      at: {
        hex: hex ?? null,
        party,
      },
    });

    info(`✓ ap: ${pillar} (${tier}) — ${note}${hex ? ` @ ${hex}` : ''}`);
  };
}
