import { requireFile, requireSession } from '../guards.ts';
import { deriveCurrentHex } from '../hex';
import { info } from '../report.ts';
import type { Context } from '../types';

export default function current(ctx: Context) {
  return () => {
    if (!requireSession(ctx)) {
      return;
    }
    if (!requireFile(ctx)) {
      return;
    }
    const hex = ctx.lastHex ?? deriveCurrentHex(ctx.file);
    ctx.lastHex = hex;
    if (!hex) {
      return info('∅ current hex unknown');
    }
    info(hex);
  };
}
