import type { Context } from '../types';
import { getAllCharacterIds } from '../characters';
import { appendEvent } from '../events';

export default function party(ctx: Context) {
  return async (args: string[]) => {
    const sub = (args[0] ?? '').toLowerCase();

    if (sub === 'add') {
      if (!ctx.sessionId) {
        return console.log('⚠ start or resume a session first');
      }
      const id = args[1];
      if (!id) {
        return console.log('usage: party add <id>   (TIP: type a letter then press TAB)');
      }
      const exists = getAllCharacterIds().some(c => c.toLowerCase() === id.toLowerCase());
      if (!exists) {
        return console.log(`❌ unknown id '${id}'. Try TAB for suggestions.`);
      }
      if (!ctx.party.find(p => p.toLowerCase() === id.toLowerCase())) {
        ctx.party.push(id);
        appendEvent(ctx.file!, 'party_set', { ids: [...ctx.party] });
      }
      console.log(`✓ party: ${ctx.party.join(', ')}`);
      return;
    }

    if (sub === 'clear') {
      if (!ctx.sessionId) {
        return console.log('⚠ start or resume a session first');
      }
      ctx.party = [];
      appendEvent(ctx.file!, 'party_set', { ids: [] });
      console.log('✓ party cleared');
      return;
    }

    if (sub === 'list') {
      console.log(ctx.party.length ? ctx.party.join(', ') : '∅ (no active characters)');
      return;
    }

    if (sub === 'remove') {
      if (!ctx.sessionId) {
        return console.log('⚠ start or resume a session first');
      }
      const id = args[1];
      if (!id) {
        return console.log('usage: party remove <id>   (TIP: type a letter then press TAB)');
      }
      const before = ctx.party.length;
      ctx.party = ctx.party.filter(p => p.toLowerCase() !== id.toLowerCase());
      if (ctx.party.length === before) {
        return console.log(`∅ '${id}' not in party`);
      }
      appendEvent(ctx.file!, 'party_set', { ids: [...ctx.party] });
      console.log(`✓ removed '${id}'. party: ${ctx.party.join(', ') || '∅'}`);
      return;
    }

    console.log('usage: party <add <id>|clear|list|remove <id>>');
  };
}
