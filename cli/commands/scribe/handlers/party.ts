import type { Context } from '../types';
import { getAllCharacterIds } from '../characters';
import { appendEvent } from '../events';
import { requireSession } from '../guards.ts';
import { error, info, usage, warn } from '../report.ts';

export default function party(ctx: Context) {
  return async (args: string[]) => {
    const sub = (args[0] ?? '').toLowerCase();

    if (sub === 'add') {
      if (!requireSession(ctx)) {
        return;
      }
      const id = args[1];
      if (!id) {
        return usage('usage: party add <id>   (TIP: type a letter then press TAB)');
      }
      const exists = getAllCharacterIds().some(c => c.toLowerCase() === id.toLowerCase());
      if (!exists) {
        return error(`❌ unknown id '${id}'. Try TAB for suggestions.`);
      }
      if (!ctx.party.find(p => p.toLowerCase() === id.toLowerCase())) {
        ctx.party.push(id);
        appendEvent(ctx.file!, 'party_set', { ids: [...ctx.party] });
      }
      info(`✓ party: ${ctx.party.join(', ')}`);
      return;
    }

    if (sub === 'clear') {
      if (!requireSession(ctx)) {
        return;
      }
      ctx.party = [];
      appendEvent(ctx.file!, 'party_set', { ids: [] });
      info('✓ party cleared');
      return;
    }

    if (sub === 'list') {
      info(ctx.party.length ? ctx.party.join(', ') : '∅ (no active characters)');
      return;
    }

    if (sub === 'remove') {
      if (!requireSession(ctx)) {
        return;
      }
      const id = args[1];
      if (!id) {
        return usage('usage: party remove <id>   (TIP: type a letter then press TAB)');
      }
      const before = ctx.party.length;
      ctx.party = ctx.party.filter(p => p.toLowerCase() !== id.toLowerCase());
      if (ctx.party.length === before) {
        return warn(`∅ '${id}' not in party`);
      }
      appendEvent(ctx.file!, 'party_set', { ids: [...ctx.party] });
      info(`✓ removed '${id}'. party: ${ctx.party.join(', ') || '∅'}`);
      return;
    }

    usage('usage: party <add <id>|clear|list|remove <id>>');
  };
}
