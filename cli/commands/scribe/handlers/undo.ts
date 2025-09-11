import { readJsonl, writeJsonl } from '../lib/jsonl';
import type { Context } from '../types';
import { requireFile } from '../guards.ts';

export default function undo(ctx: Context) {
  return (args: string[]) => {
    if (!requireFile(ctx)) {
      return;
    }
    const n = Math.max(1, parseInt(args[0] ?? '1', 10));
    const evs = readJsonl(ctx.file!); // Checked by `requireFile`
    if (!evs.length) {
      return console.log('∅ nothing to undo');
    }
    const kept = evs.slice(0, Math.max(0, evs.length - n));
    writeJsonl(ctx.file!, kept); // Checked by `requireFile`
    const lastMove = [...kept].reverse().find(e => e.kind==='move');
    ctx.lastHex = (lastMove?.payload as any)?.to ?? null;
    console.log(`↩ undone ${Math.min(n, evs.length)} event(s)`);
  };
}
