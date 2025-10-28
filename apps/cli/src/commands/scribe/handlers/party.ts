import { askLine, error, info, usage } from '@skyreach/cli-kit';

import { appendEvent, readEvents } from '../../../services/event-log.service';
import {
  formatPartyMember,
  matchesPartyMember,
} from '../../../services/party-member.service';
import { selectParty } from '../../../services/projectors.service';
import { getAllCharacterIds } from '../services/character';
import { requireSession } from '../services/general';

import type { Context } from '../types';
import type { PartyMember } from '@skyreach/schemas';

export default function party(ctx: Context) {
  return async (args: string[]) => {
    const sub = (args[0] ?? '').toLowerCase();

    if (sub === 'guest') {
      if (!requireSession(ctx)) {
        return;
      }
      if (!ctx.rl) {
        return error('❌ Interactive mode required for guest PC prompts');
      }

      try {
        const playerName = await askLine(ctx.rl, 'Enter player name: ');
        if (!playerName.trim()) {
          return error('❌ Player name cannot be empty');
        }

        const characterName = await askLine(ctx.rl, 'Enter character name: ');
        if (!characterName.trim()) {
          return error('❌ Character name cannot be empty');
        }

        const evs = readEvents(ctx.file!);
        const current = selectParty(evs);
        const guest: PartyMember = {
          playerName: playerName.trim(),
          characterName: characterName.trim(),
        };
        const next = [...current, guest];

        appendEvent(ctx.file!, 'party_set', { ids: next });
        info(
          `✓ party: ${next.map(formatPartyMember).join(', ') || '∅'}`,
        );
      } catch (err) {
        if (err instanceof Error && err.message.includes('Canceled')) {
          return info('Canceled');
        }
        throw err;
      }
      return;
    }

    if (sub === 'add') {
      if (!requireSession(ctx)) {
        return;
      }
      const id = args[1];
      if (!id) {
        return usage(
          'usage: party add <id>   (TIP: type a letter then press TAB)',
        );
      }
      const exists = getAllCharacterIds().some(
        (c) => c.toLowerCase() === id.toLowerCase(),
      );
      if (!exists) {
        return error(`❌ unknown id '${id}'. Try TAB for suggestions.`);
      }
      const evs = readEvents(ctx.file!);
      const current = selectParty(evs);
      if (!current.find((p) => matchesPartyMember(p, id))) {
        const next = [...current, id];
        appendEvent(ctx.file!, 'party_set', { ids: next });
      }
      const latest = selectParty(readEvents(ctx.file!));
      info(
        `✓ party: ${latest.map(formatPartyMember).join(', ') || '∅'}`,
      );
      return;
    }

    if (sub === 'clear') {
      if (!requireSession(ctx)) {
        return;
      }
      appendEvent(ctx.file!, 'party_set', { ids: [] });
      info('✓ party cleared');
      return;
    }

    if (sub === 'list') {
      const evs = readEvents(ctx.file!);
      const current = selectParty(evs);
      info(current.length ? current.map(formatPartyMember).join(', ') : '∅ (no active characters)');
      return;
    }

    if (sub === 'remove') {
      if (!requireSession(ctx)) {
        return;
      }
      const id = args[1];
      if (!id) {
        return usage(
          'usage: party remove <id>   (TIP: type a letter then press TAB)',
        );
      }
      const evs = readEvents(ctx.file!);
      const current = selectParty(evs);
      const next = current.filter((p) => !matchesPartyMember(p, id));
      if (next.length === current.length) {
        return info(`∅ '${id}' not in party`);
      }
      appendEvent(ctx.file!, 'party_set', { ids: next });
      const latest = selectParty(readEvents(ctx.file!));
      info(`✓ removed '${id}'. party: ${latest.map(formatPartyMember).join(', ') || '∅'}`);
      return;
    }

    usage('usage: party <add <id>|guest|clear|list|remove <id>>');
  };
}
