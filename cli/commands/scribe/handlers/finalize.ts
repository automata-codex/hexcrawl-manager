import path from 'node:path';
import { nowISO } from '../events';
import { readJsonl, writeJsonl } from '../lib/jsonl';
import { sessionsDir } from '../lib/session-files';
import type { Context } from '../types';

export default function finalize(ctx: Context) {
  return () => {
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
    evs.sort((a,b)=> a.ts.localeCompare(b.ts));
    evs.forEach((e,i)=> e.seq = i+1);
    const out = path.join(sessionsDir(), `${ctx.sessionId}.jsonl`);
    writeJsonl(out, evs);
    console.log(`✔ finalized → ${out}`);
  };
}
