import { requireFile, requireSession } from '../guards.ts';
import { info } from '../report.ts';
import { finalizeSession } from '../services/session.ts';
import type { Context } from '../types';

export default function finalize(ctx: Context) {
  return () => {
    if (!requireSession(ctx)) {
      return;
    }
    if (!requireFile(ctx)) {
      return;
    }
    const out = finalizeSession(ctx.sessionId!, ctx.file!); // Checked by `requireSession` and `requireFile`
    info(`✔ finalized → ${out}`);
  };
}
