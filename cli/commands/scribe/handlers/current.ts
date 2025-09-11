import type { Context } from '../types';
import { deriveCurrentHex } from '../hex';

export default function current(ctx: Context) {
  return () => {
    if (!ctx.sessionId || !ctx.file) {
      return console.log('⚠ start or resume a session first');
    }
    const hex = ctx.lastHex ?? deriveCurrentHex(ctx.file);
    ctx.lastHex = hex;
    if (!hex) {
      return console.log('∅ current hex unknown');
    }
    console.log(hex);
  };
}
