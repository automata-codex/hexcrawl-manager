import type {Context} from './types.ts';

export function requireCurrentHex(ctx: Context): boolean {
  if (!ctx.lastHex) {
    console.log('⚠ no current hex; move to a hex first');
    return false;
  }
  return true;
}

export function requireFile(ctx: Context): boolean {
  if (!ctx.file) {
    console.log('⚠ no in-progress file; start a session first');
    return false;
  }
  return true;
}

export function requireSession(ctx: Context): boolean {
  if (!ctx.sessionId) {
    console.log('⚠ start or resume a session first');
    return false;
  }
  return true;
}
