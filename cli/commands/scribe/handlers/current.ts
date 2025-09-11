import type { Context } from '../types';
import { deriveCurrentHex } from '../hex';
import { requireFile, requireSession } from '../guards.ts';

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
      return console.log('∅ current hex unknown');
    }
    console.log(hex);
  };
}
