import { requireFile } from '../guards.ts';
import { info } from '../report.ts';
import { readEvents, writeEvents } from '../services/event-log.ts';
import type { Context } from '../types';

export default function undo(ctx: Context) {
  return (args: string[]) => {
    if (!requireFile(ctx)) {
      return;
    }
    const n = Math.max(1, parseInt(args[0] ?? '1', 10));
    const evs = readEvents(ctx.file!); // Checked by `requireFile`
    if (!evs.length) {
      return info('∅ nothing to undo');
    }
    const kept = evs.slice(0, Math.max(0, evs.length - n));
    writeEvents(ctx.file!, kept); // Checked by `requireFile`
    const lastMove = [...kept].reverse().find(e => e.kind==='move');
    ctx.lastHex = (lastMove?.payload as any)?.to ?? null;
    info(`↩ undone ${Math.min(n, evs.length)} event(s)`);
  };
}
