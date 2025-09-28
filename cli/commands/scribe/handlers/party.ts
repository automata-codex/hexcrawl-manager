import { error, info, usage, warn } from '@skyreach/cli-kit';
import { selectParty } from '../projectors.ts';
import { getAllCharacterIds } from '../services/character';
import { appendEvent, readEvents } from '../services/event-log';

import type { Context } from '../types';
import { requireSession } from '../services/general.ts';

export default function party(ctx: Context) {
  return async (args: string[]) => {
    const sub = (args[0] ?? '').toLowerCase();

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
      if (!current.find((p) => p.toLowerCase() === id.toLowerCase())) {
        const next = [...current, id];
        appendEvent(ctx.file!, 'party_set', { ids: next });
      }
      info(
        `✓ party: ${[...new Set(selectParty(readEvents(ctx.file!)).map((x) => x))].join(', ') || '∅'}`,
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
      info(current.length ? current.join(', ') : '∅ (no active characters)');
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
      const next = current.filter((p) => p.toLowerCase() !== id.toLowerCase());
      if (next.length === current.length) {
        return info(`∅ '${id}' not in party`);
      }
      appendEvent(ctx.file!, 'party_set', { ids: next });
      const latest = selectParty(readEvents(ctx.file!));
      info(`✓ removed '${id}'. party: ${latest.join(', ') || '∅'}`);
      return;
    }

    usage('usage: party <add <id>|clear|list|remove <id>>');
  };
}
