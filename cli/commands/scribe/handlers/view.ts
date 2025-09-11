import type { Context } from '../types';
import { readJsonl } from '../lib/jsonl';

export default function view(ctx: Context) {
  return (args: string[]) => {
    if (!ctx.file) {
      return console.log('⚠ no session');
    }
    const n = Math.max(1, parseInt(args[0] ?? '10', 10));
    const evs = readJsonl(ctx.file);
    for (const e of evs.slice(-n)) {
      console.log(`#${e.seq} ${e.ts} ${e.kind} ${JSON.stringify(e.payload)}`);
    }
  };
}
