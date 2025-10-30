import { info, usage } from '@skyreach/cli-kit';
import { PILLARS, TIERS } from '@skyreach/schemas';

import { appendEvent, readEvents } from '../../../services/event-log.service';
import { partyMemberToString } from '../../../services/party-member.service';
import {
  selectCurrentHex,
  selectParty,
} from '../../../services/projectors.service';
import { requireSession } from '../services/general';

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
    const partyMembers = selectParty(events);

    // Convert PartyMember[] to string[] for AP event
    const party = partyMembers.map(partyMemberToString);

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
