import { warn } from './report';
import type {Context} from './types';

export function requireCurrentHex(ctx: Context): boolean {
  if (!ctx.lastHex) {
    warn('⚠ no current hex; move to a hex first');
    return false;
  }
  return true;
}

export function requireFile(ctx: Context): boolean {
  if (!ctx.file) {
    warn('⚠ no in-progress file; start a session first');
    return false;
  }
  return true;
}

export function requireSession(ctx: Context): boolean {
  if (!ctx.sessionId) {
    warn('⚠ start or resume a session first');
    return false;
  }
  return true;
}
