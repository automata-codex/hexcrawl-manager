import { Command } from 'commander';
import { existsSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { ensureLogs, inprogressPath, sessionsDir } from '../utils/session-files';
import { type Event, readJsonl, writeJsonl, appendJsonl } from '../utils/jsonl';

type Context = {
  sessionId: string | null;
  file: string | null; // in-progress file path
  lastHex: string | null;
};

const HELP_TEXT = `
Commands:
  start <id>        start/resume a session
  move <to> [pace]  record a move (pace: fast|normal|slow)
  note <text...>    add a note
  help              show this help
  view [n]          show last n events (default 10)
  undo [n]          remove last n in-progress events (default 1)
  finalize          freeze session → logs/sessions/<id>.jsonl
  exit/quit         leave the shell
`;

function appendEvent(ctx: Context, kind: string, payload: Record<string, unknown>) {
  if (!ctx.file) throw new Error('No session started. Use: start <session-id>');
  const evs = readJsonl(ctx.file);
  const rec: Event = { seq: nextSeq(evs), ts: nowISO(), kind, payload };
  appendJsonl(ctx.file, rec);
  return rec;
}

function nextSeq(existing: Event[]) {
  return existing.length ? Math.max(...existing.map(e => e.seq)) + 1 : 1;
}

function nowISO() { return new Date().toISOString(); }

// Allow quoted args: note "party rests here"
function tokenize(s: string): string[] {
  const out: string[] = [];
  let cur = '', q: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++){
    const c = s[i];
    if (q) {
      if (c===q) q=null; else cur+=c;
    } else if (c === '"' || c === "'") {
      q = c as any;
    } else if (/\s/.test(c)) {
      if (cur) {
        out.push(cur); cur='';
      }
    } else cur += c;
  }
  if (cur) out.push(cur);
  return out;
}


export const scribeCommand = new Command('scribe')
  .description('Open the in-session logging shell')
  .argument('[sessionId]', 'Optional: auto-start this session')
  .action((initialSessionId?: string) => {
    ensureLogs();
    const ctx: Context = { sessionId: null, file: null, lastHex: null };

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'scribe > ',
      historySize: 200,
    });

    const help = () => {
      console.log(HELP_TEXT);
    };

    const start = (id: string) => {
      ctx.sessionId = id;
      ctx.file = inprogressPath(id);
      // create file if missing, seed with session_start
      if (!existsSync(ctx.file)) {
        appendEvent(ctx, 'session_start', { status: 'inprogress', id });
        console.log(`started: ${id}`);
      } else {
        const evs = readJsonl(ctx.file);
        const lastMove = [...evs].reverse().find(e => e.kind === 'move');
        ctx.lastHex = (lastMove?.payload as any)?.to ?? null;
        console.log(`resumed: ${id} (${evs.length} events)`);
      }
    };

    const handlers: Record<string, (args: string[]) => void> = {
      start: (args) => {
        const id = args[0] ?? new Date().toISOString().slice(0,10);
        start(id);
      },
      move: (args) => {
        if (!ctx.sessionId) {
          return console.log('⚠ start a session first');
        }
        const to = (args[0] ?? '').toUpperCase();
        if (!to) {
          return console.log('usage: move <to> [pace]');
        }
        const pace = (args[1] ?? 'normal') as 'fast'|'normal'|'slow';
        const from = ctx.lastHex;
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
      view: (args) => {
        if (!ctx.file) {
          return console.log('⚠ no session');
        }
        const n = Math.max(1, parseInt(args[0] ?? '10', 10));
        const evs = readJsonl(ctx.file);
        for (const e of evs.slice(-n)) {
          console.log(`#${e.seq} ${e.ts} ${e.kind} ${JSON.stringify(e.payload)}`);
        }
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
      exit: () => rl.close(),
      quit: () => rl.close()
    };

    help();
    if (initialSessionId) {
      handlers.start([initialSessionId]);
    }
    rl.prompt();

    rl.on('line', async (line) => {
      const [cmd, ...args] = line.trim().split(/\s+/);
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
