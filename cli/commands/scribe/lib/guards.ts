import { selectCurrentHex } from '../projectors.ts';
import { readEvents } from '../services/event-log.ts';

import { warn } from './report.ts';

import type { Context } from '../types.ts';

export function requireCurrentHex(ctx: Context): boolean {
  if (!ctx.file) {
    warn('⚠ no session');
    return false;
  }
  const hex = selectCurrentHex(readEvents(ctx.file));
  if (!hex) {
    warn(
      '⚠ no current hex known—make a move or start with a starting hex first',
    );
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
