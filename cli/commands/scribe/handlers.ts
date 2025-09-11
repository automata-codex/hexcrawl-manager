import path from 'node:path';
import { existsSync } from 'node:fs';
import { readJsonl, writeJsonl } from '../../utils/jsonl';
import { sessionsDir, inProgressPath } from '../../utils/session-files';

import { getAllCharacterIds } from './characters';
import { HELP_TEXT, ALLOWED_PILLARS, ALLOWED_TIERS, HEX_RE } from './constants';
import { appendEvent, nowISO } from './events';
import { normalizeHex, deriveCurrentHex, lastHexFromEvents } from './hex';
import { findLatestInProgress } from './in-progress';
import { type Context } from './types';

export function makeHandlers(ctx: Context, presetSessionId?: string) {
  const help = () => { console.log(HELP_TEXT); };

  const start = (id: string, startHex: string) => {
    const startHexNorm = normalizeHex(startHex);
    ctx.sessionId = id;
    ctx.file = inProgressPath(id);

    if (!HEX_RE.test(startHexNorm)) {
      console.log(`❌ Invalid starting hex: ${startHex}`);
      return;
    }

    if (!existsSync(ctx.file)) {
      ctx.lastHex = startHexNorm;
      appendEvent(ctx.file, 'session_start', { status: 'in-progress', id, startHex: startHexNorm });
      console.log(`started: ${id} @ ${startHexNorm}`);
    } else {
      const evs = readJsonl(ctx.file);
      ctx.lastHex = lastHexFromEvents(evs) ?? startHexNorm;
      console.log(`resumed: ${id} (${evs.length} events)`);
    }
  };

  const handlers: Record<string, (args: string[]) => void | Promise<void>> = {
    ap: (args) => {
      if (!ctx.sessionId) return console.log('⚠ start or resume a session first');
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

      if (!note) return console.log('usage: ap <pillar> <tier> <note...>');

      const hex = ctx.lastHex ?? deriveCurrentHex(ctx.file);

      appendEvent(ctx.file!, 'advancement_point', {
        pillar,
        tier,
        note,
        at: { hex: hex ?? null, party: [...ctx.party] }
      });

      console.log(`✓ ap: ${pillar} (${tier}) — ${note}${hex ? ` @ ${hex}` : ''}`);
    },

    current: () => {
      if (!ctx.sessionId || !ctx.file) return console.log('⚠ start or resume a session first');
      const hex = ctx.lastHex ?? deriveCurrentHex(ctx.file);
      ctx.lastHex = hex;
      if (!hex) return console.log('∅ current hex unknown');
      console.log(hex);
    },

    exit: () => process.exit(0),

    finalize: () => {
      if (!ctx.sessionId || !ctx.file) return console.log('⚠ start a session first');
      const evs = readJsonl(ctx.file);
      if (!evs.find(e => e.kind === 'session_end')) {
        evs.push({ seq: (evs.at(-1)?.seq ?? 0) + 1, ts: nowISO(), kind: 'session_end', payload: { status: 'final' } });
      }
      evs.sort((a,b)=> a.ts.localeCompare(b.ts));
      evs.forEach((e,i)=> e.seq = i+1);
      const out = path.join(sessionsDir(), `${ctx.sessionId}.jsonl`);
      writeJsonl(out, evs);
      console.log(`✔ finalized → ${out}`);
    },

    help: () => help(),

    move: (args) => {
      if (!ctx.sessionId) return console.log('⚠ start or resume a session first');
      const to = (args[0] ?? '').toUpperCase();
      if (!to) return console.log('usage: move <to> [pace]');
      if (!HEX_RE.test(to)) return console.log('❌ Invalid hex id');
      const pace = (args[1] ?? 'normal') as 'fast'|'normal'|'slow';
      const from = ctx.lastHex ?? null;
      if (!from) console.log('(note) starting move has no previous hex');
      appendEvent(ctx.file!, 'move', { from, to, pace });
      ctx.lastHex = to;
      console.log(`→ move to ${to}${from ? ` (from ${from})` : ''} [${pace}]`);
    },

    note: (args) => {
      if (!ctx.sessionId) return console.log('⚠ start a session first');
      const text = args.join(' ');
      if (!text) return console.log('usage: note <text…>');
      appendEvent(ctx.file!, 'note', { text, scope: 'session' });
      console.log(`  note added`);
    },

    party: async (args) => {
      const sub = (args[0] ?? '').toLowerCase();

      if (sub === 'add') {
        if (!ctx.sessionId) return console.log('⚠ start or resume a session first');
        const id = args[1];
        if (!id) return console.log('usage: party add <id>   (TIP: type a letter then press TAB)');
        const exists = getAllCharacterIds().some(c => c.toLowerCase() === id.toLowerCase());
        if (!exists) return console.log(`❌ unknown id '${id}'. Try TAB for suggestions.`);
        if (!ctx.party.find(p => p.toLowerCase() === id.toLowerCase())) {
          ctx.party.push(id);
          appendEvent(ctx.file!, 'party_set', { ids: [...ctx.party] });
        }
        console.log(`✓ party: ${ctx.party.join(', ')}`);
        return;
      }

      if (sub === 'clear') {
        if (!ctx.sessionId) return console.log('⚠ start or resume a session first');
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
        if (!ctx.sessionId) return console.log('⚠ start or resume a session first');
        const id = args[1];
        if (!id) return console.log('usage: party remove <id>   (TIP: type a letter then press TAB)');
        const before = ctx.party.length;
        ctx.party = ctx.party.filter(p => p.toLowerCase() !== id.toLowerCase());
        if (ctx.party.length === before) return console.log(`∅ '${id}' not in party`);
        appendEvent(ctx.file!, 'party_set', { ids: [...ctx.party] });
        console.log(`✓ removed '${id}'. party: ${ctx.party.join(', ') || '∅'}`);
        return;
      }

      console.log('usage: party <list|add <id>|clear|remove <id>>');
    },

    quit: () => process.exit(0),

    resume: (args) => {
      if (args[0]) {
        const id = args[0];
        const p = inProgressPath(id);
        if (!existsSync(p)) {
          console.log(`❌ No in-progress log for '${id}' at ${p}`);
          return;
        }
        ctx.sessionId = id;
        ctx.file = p;
        const evs = readJsonl(p);
        ctx.lastHex = lastHexFromEvents(evs);
        console.log(`resumed: ${id} (${evs.length} events)${ctx.lastHex ? ` — last hex ${ctx.lastHex}` : ''}`);
        return;
      }
      const latest = findLatestInProgress();
      if (!latest) return console.log('∅ No in-progress sessions found. Use: start <hex>  or  start <sessionId> <hex>');
      ctx.sessionId = latest.id;
      ctx.file = latest.path;
      const evs = readJsonl(latest.path);
      ctx.lastHex = lastHexFromEvents(evs);
      console.log(`resumed: ${latest.id} (${evs.length} events)${ctx.lastHex ? ` — last hex ${ctx.lastHex}` : ''}`);
    },

    start: (args) => {
      if (args.length === 0) {
        console.log('usage:\n  start <hex>\n  start <sessionId> <hex>');
        return;
      }
      if (args.length === 1) {
        const hex = args[0];
        if (!HEX_RE.test(hex)) {
          console.log('❌ Invalid hex. Example: `start P13` or `start session-19 P13`');
          return;
        }
        const id = presetSessionId ?? new Date().toISOString().slice(0,10);
        start(id, hex);
        return;
      }
      const [id, hex] = args;
      if (!HEX_RE.test(hex)) {
        console.log('❌ Invalid hex. Example: `start P13` or `start session-19 P13`');
        return;
      }
      start(id, hex);
    },

    trail: (args) => {
      if (!ctx.sessionId) return console.log('⚠ start or resume a session first');
      if (!ctx.lastHex) return console.log('⚠ no current hex known—make a move or start with a starting hex first');
      const otherRaw = args[0];
      if (!otherRaw) return console.log('usage: trail <hex>');
      const other = normalizeHex(otherRaw);
      if (!HEX_RE.test(other)) return console.log('❌ Invalid hex. Example: trail P14');
      const from = normalizeHex(ctx.lastHex);
      if (from === other) return console.log('❌ Cannot mark a trail to the same hex');
      appendEvent(ctx.file!, 'trail', { from, to: other, marked: true });
      console.log(`✓ marked trail ${from} ↔ ${other}`);
    },

    undo: (args) => {
      if (!ctx.file) return console.log('⚠ no session');
      const n = Math.max(1, parseInt(args[0] ?? '1', 10));
      const evs = readJsonl(ctx.file);
      if (!evs.length) return console.log('∅ nothing to undo');
      const kept = evs.slice(0, Math.max(0, evs.length - n));
      writeJsonl(ctx.file, kept);
      const lastMove = [...kept].reverse().find(e => e.kind==='move');
      ctx.lastHex = (lastMove?.payload as any)?.to ?? null;
      console.log(`↩ undone ${Math.min(n, evs.length)} event(s)`);
    },

    view: (args) => {
      if (!ctx.file) return console.log('⚠ no session');
      const n = Math.max(1, parseInt(args[0] ?? '10', 10));
      const evs = readJsonl(ctx.file);
      for (const e of evs.slice(-n)) {
        console.log(`#${e.seq} ${e.ts} ${e.kind} ${JSON.stringify(e.payload)}`);
      }
    }
  };

  return { handlers, help };
}
