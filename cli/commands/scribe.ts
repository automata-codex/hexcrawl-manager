import { Command } from 'commander';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { ensureLogs, inprogressPath, inprogressDir, sessionsDir } from '../utils/session-files';
import { type Event, readJsonl, writeJsonl, appendJsonl } from '../utils/jsonl';

type Context = {
  sessionId: string | null;
  file: string | null; // in-progress file path
  lastHex: string | null;
};

const HEX_RE = /^[A-Za-z][0-9]+$/;
const HELP_TEXT = `
Commands:
  current                    print the current hex
  exit                       leave the shell
  finalize                   freeze session → logs/sessions/<id>.jsonl
  help                       show this help
  mark <hex>                 mark a trail from current hex to <hex>
  move <to> [pace]           record a move (pace: fast|normal|slow)
  note <text...>             add a note
  quit                       leave the shell
  resume [sessionId]         resume the latest (or the specified) in-progress session
  start <hex>                start a new session using default/preset id
  start <sessionId> <hex>    start with explicit session id
  undo [n]                   remove last n in-progress events (default 1)
  view [n]                   show last n events (default 10)
`;

function appendEvent(ctx: Context, kind: string, payload: Record<string, unknown>) {
  if (!ctx.file) {
    throw new Error('No session started. Use: start <hex> or start <sessionId> <hex>');
  }
  const evs = readJsonl(ctx.file);
  const rec: Event = { seq: nextSeq(evs), ts: nowISO(), kind, payload };
  appendJsonl(ctx.file, rec);
  return rec;
}

function deriveCurrentHex(ctx: Context): string | null {
  if (!ctx.file) {
    return null;
  }
  const evs = readJsonl(ctx.file);
  // Prefer the last move's destination
  const lastMove = [...evs].reverse().find(e => e.kind === 'move');
  if (lastMove && lastMove.payload && typeof lastMove.payload === 'object') {
    const to = (lastMove.payload as any).to;
    if (typeof to === 'string') {
      return to.toUpperCase();
    }
  }
  // Fallback to the start hex if present
  const start = evs.find(e => e.kind === 'session_start');
  if (start && start.payload && typeof start.payload === 'object') {
    const hx = (start.payload as any).startHex;
    if (typeof hx === 'string') {
      return hx.toUpperCase();
    }
  }
  return null;
}

function findLatestInprogress(): { id: string; path: string } | null {
  const dir = inprogressDir();
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
  if (!files.length) return null;
  const withStats = files
    .map(f => ({ f, p: path.join(dir, f), s: statSync(path.join(dir, f)) }))
    .sort((a, b) => b.s.mtimeMs - a.s.mtimeMs);
  const top = withStats[0];
  const id = top.f.replace(/\.jsonl$/, '');
  return { id, path: top.p };
}

function lastHexFromEvents(evs: Event[]) {
  const lastMove = [...evs].reverse().find(e => e.kind === 'move');
  if (lastMove?.payload && typeof lastMove.payload === 'object') {
    const to = (lastMove.payload as any).to;
    if (typeof to === 'string') return to.toUpperCase();
  }
  const start = evs.find(e => e.kind === 'session_start');
  if (start?.payload && typeof start.payload === 'object') {
    const hx = (start.payload as any).startHex;
    if (typeof hx === 'string') return hx.toUpperCase();
  }
  return null;
}

function nextSeq(existing: Event[]) {
  return existing.length ? Math.max(...existing.map(e => e.seq)) + 1 : 1;
}

function normalizeHex(h: string) {
  return h.trim().toUpperCase();
}

function nowISO() { return new Date().toISOString(); }

// Allow quoted args: note "party rests here"
function tokenize(s: string): string[] {
  const out: string[] = [];
  let cur = '', q: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++){
    const c = s[i];
    if (q) {
      if (c === q) {
        q = null;
      } else {
        cur += c;
      }
    } else if (c === '"' || c === "'") {
      q = c as any;
    } else if (/\s/.test(c)) {
      if (cur) {
        out.push(cur); cur='';
      }
    }
    else cur += c;
  }
  if (cur) {
    out.push(cur);
  }
  return out;
}

export const scribeCommand = new Command('scribe')
  .description('Open the in-session logging shell')
  .argument('[presetSessionId]', 'Optional: preset session id to use with `start <hex>`')
  .action((presetSessionId?: string) => {
    ensureLogs();
    const ctx: Context = { sessionId: null, file: null, lastHex: null };

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'scribe > ',
      historySize: 200,
    });

    const help = () => { console.log(HELP_TEXT); };

    const start = (id: string, startHex: string) => {
      const startHexNorm = normalizeHex(startHex);
      ctx.sessionId = id;
      ctx.file = inprogressPath(id);

      if (!HEX_RE.test(startHexNorm)) {
        console.log(`❌ Invalid starting hex: ${startHex}`);
        return;
      }

      // create file if missing, seed with session_start
      if (!existsSync(ctx.file)) {
        ctx.lastHex = startHexNorm;
        appendEvent(ctx, 'session_start', { status: 'inprogress', id, startHex: startHexNorm });
        console.log(`started: ${id} @ ${startHexNorm}`);
      } else {
        const evs = readJsonl(ctx.file);
        ctx.lastHex = lastHexFromEvents(evs) ?? startHexNorm;
        console.log(`resumed: ${id} (${evs.length} events)`);
      }
    };

    const handlers: Record<string, (args: string[]) => void> = {
      current: () => {
        if (!ctx.sessionId || !ctx.file) {
          return console.log('⚠ start or resume a session first');
        }
        const hex = ctx.lastHex ?? deriveCurrentHex(ctx);
        ctx.lastHex = hex; // cache for subsequent commands
        if (!hex) {
          return console.log('∅ current hex unknown');
        }
        console.log(hex);
      },

      exit: () => rl.close(),

      finalize: () => {
        if (!ctx.sessionId || !ctx.file) {
          return console.log('⚠ start a session first');
        }
        const evs = readJsonl(ctx.file);
        if (!evs.find(e => e.kind === 'session_end')) {
          evs.push({
            seq: (evs.at(-1)?.seq ?? 0) + 1,
            ts: nowISO(),
            kind: 'session_end',
            payload: { status: 'final' }
          });
        }
        // renumber by timestamp so it’s clean
        evs.sort((a,b)=> a.ts.localeCompare(b.ts));
        evs.forEach((e,i)=> e.seq = i+1);
        const out = path.join(sessionsDir(), `${ctx.sessionId}.jsonl`);
        writeJsonl(out, evs);
        console.log(`✔ finalized → ${out}`);
      },

      help: () => help(),

      mark: (args) => {
        if (!ctx.sessionId) {
          return console.log('⚠ start or resume a session first');
        }
        if (!ctx.lastHex) {
          return console.log('⚠ no current hex known—make a move or start with a starting hex first');
        }
        const otherRaw = args[0];
        if (!otherRaw) {
          return console.log('usage: mark <hex>');
        }
        const other = normalizeHex(otherRaw);
        if (!HEX_RE.test(other)) {
          return console.log('❌ Invalid hex. Example: mark P14');
        }
        const from = normalizeHex(ctx.lastHex);
        if (from === other) {
          return console.log('❌ Cannot mark a trail to the same hex');
        }

        appendEvent(ctx, 'trail', { from, to: other, marked: true });
        console.log(`✓ marked trail ${from} ↔ ${other}`);
      },

      move: (args) => {
        if (!ctx.sessionId) {
          return console.log('⚠ start or resume a session first');
        }
        const to = (args[0] ?? '').toUpperCase();
        if (!to) {
          return console.log('usage: move <to> [pace]');
        }
        if (!HEX_RE.test(to)) {
          return console.log('❌ Invalid hex id');
        }
        const pace = (args[1] ?? 'normal') as 'fast'|'normal'|'slow';
        const from = ctx.lastHex;
        if (!from) {
          console.log('(note) starting move has no previous hex');
        }
        appendEvent(ctx, 'move', { from, to, pace });
        ctx.lastHex = to;
        console.log(`→ move to ${to}${from ? ` (from ${from})` : ''} [${pace}]`);
      },

      note: (args) => {
        if (!ctx.sessionId) {
          return console.log('⚠ start a session first');
        }
        const text = args.join(' ');
        if (!text) {
          return console.log('usage: note <text…>');
        }
        appendEvent(ctx, 'note', { text, scope: 'session' });
        console.log(`  note added`);
      },

      quit: () => rl.close(),

      resume: (args) => {
        // 1) If a session id is given, resume that exact file
        if (args[0]) {
          const id = args[0];
          const p = inprogressPath(id);
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

        // 2) Otherwise, resume the most recent in-progress file by mtime
        const latest = findLatestInprogress();
        if (!latest) {
          console.log('∅ No in-progress sessions found. Use: start <hex>  or  start <sessionId> <hex>');
          return;
        }
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
          // form: start <hex>  (use preset or default id)
          const hex = args[0];
          if (!HEX_RE.test(hex)) {
            console.log('❌ Invalid hex. Example: `start P13` or `start session-19 P13`');
            return;
          }
          const id = presetSessionId ?? new Date().toISOString().slice(0,10);
          start(id, hex);
          return;
        }
        // form: start <sessionId> <hex>
        const [id, hex] = args;
        if (!HEX_RE.test(hex)) {
          console.log('❌ Invalid hex. Example: `start P13` or `start session-19 P13`');
          return;
        }
        start(id, hex);
      },

      undo: (args) => {
        if (!ctx.file) {
          return console.log('⚠ no session');
        }
        const n = Math.max(1, parseInt(args[0] ?? '1', 10));
        const evs = readJsonl(ctx.file);
        if (!evs.length) {
          return console.log('∅ nothing to undo');
        }
        const kept = evs.slice(0, Math.max(0, evs.length - n));
        writeJsonl(ctx.file, kept);
        const lastMove = [...kept].reverse().find(e => e.kind==='move');
        ctx.lastHex = (lastMove?.payload as any)?.to ?? null;
        console.log(`↩ undone ${Math.min(n, evs.length)} event(s)`);
      },

      view: (args) => {
        if (!ctx.file) {
          return console.log('⚠ no session');
        }
        const n = Math.max(1, parseInt(args[0] ?? '10', 10));
        const evs = readJsonl(ctx.file);
        for (const e of evs.slice(-n)) {
          console.log(`#${e.seq} ${e.ts} ${e.kind} ${JSON.stringify(e.payload)}`);
        }
      }
    };

    help();
    // Note: since start now *requires* a hex, we don't auto-start here.
    // If a preset session id was passed, it's used by `start <hex>` above.
    rl.prompt();

    rl.on('line', async (line) => {
      const [cmd, ...args] = tokenize(line.trim());
      if (!cmd) {
        rl.prompt();
        return;
      }
      const h = handlers[cmd];
      if (h) {
        try {
          await h(args);
        } catch (e:any) {
          console.error('Error:', e.message ?? e);
        }
      } else {
        console.log(`Unknown command: ${cmd}`);
      }
      rl.prompt();
    });

    rl.on('close', () => process.exit(0));
  });
