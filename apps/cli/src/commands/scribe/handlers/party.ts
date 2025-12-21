import { askLine, error, info, usage } from '@achm/cli-kit';

import { appendEvent, readEvents } from '../../../services/event-log.service';
import {
  formatPartyMember,
  matchesPartyMember,
} from '../../../services/party-member.service';
import { selectParty } from '../../../services/projectors.service';
import { getAllCharacterIds } from '../services/character';
import { requireSession } from '../services/general';

import type { Context } from '../types';
import type { PartyMember } from '@achm/schemas';

function parseGuestFlags(argv: string[]) {
  // Parse flags: --player-name <name> --character-name <name>
  const out: { playerName?: string; characterName?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--player-name') out.playerName = argv[++i];
    else if (a === '--character-name') out.characterName = argv[++i];
  }
  return out;
}

export default function party(ctx: Context) {
  return async (args: string[]) => {
    const sub = (args[0] ?? '').toLowerCase();

    if (sub === 'guest') {
      if (!requireSession(ctx)) {
        return;
      }

      // Parse flags from remaining args (after 'guest')
      const flagArgs = args.slice(1);
      const flags = parseGuestFlags(flagArgs);
      const hasAnyFlag =
        flags.playerName !== undefined || flags.characterName !== undefined;
      const allProvided = Boolean(flags.playerName && flags.characterName);

      // If flags provided, require both
      if (hasAnyFlag && !allProvided) {
        return usage(
          'Usage: party guest --player-name <name> --character-name <name>',
        );
      }

      let playerName: string;
      let characterName: string;

      if (allProvided) {
        // Use flag values
        playerName = flags.playerName!.trim();
        characterName = flags.characterName!.trim();
      } else {
        // Fall back to interactive prompts
        if (!ctx.rl) {
          return error('❌ Interactive mode required for guest PC prompts');
        }

        try {
          const inputPlayerName = await askLine(ctx.rl, 'Enter player name: ');
          if (!inputPlayerName.trim()) {
            return error('❌ Player name cannot be empty');
          }

          const inputCharacterName = await askLine(
            ctx.rl,
            'Enter character name: ',
          );
          if (!inputCharacterName.trim()) {
            return error('❌ Character name cannot be empty');
          }

          playerName = inputPlayerName.trim();
          characterName = inputCharacterName.trim();
        } catch (err) {
          if (err instanceof Error && err.message.includes('Canceled')) {
            return info('Canceled');
          }
          throw err;
        }
      }

      // Add guest PC to party
      const evs = readEvents(ctx.file!);
      const current = selectParty(evs);
      const guest: PartyMember = {
        playerName,
        characterName,
      };
      const next = [...current, guest];

      appendEvent(ctx.file!, 'party_set', { ids: next });
      info(`✓ party: ${next.map(formatPartyMember).join(', ') || '∅'}`);
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
      info(`✓ party: ${latest.map(formatPartyMember).join(', ') || '∅'}`);
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
      info(
        current.length
          ? current.map(formatPartyMember).join(', ')
          : '∅ (no active characters)',
      );
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
      info(
        `✓ removed '${id}'. party: ${latest.map(formatPartyMember).join(', ') || '∅'}`,
      );
      return;
    }

    usage('usage: party <add <id>|guest|clear|list|remove <id>>');
  };
}
