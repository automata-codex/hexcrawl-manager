import { warn } from '@skyreach/cli-kit';

import { readEvents } from '../../../services/event-log.service';
import { selectCurrentHex } from '../../../services/projectors.service';

import type { Context } from '../types.ts';

export function detectDevMode(args: string[]): boolean {
  return process.env.SKYREACH_DEV === 'true' || args.includes('--dev');
}

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

// Allow quoted args: note "party rests here"
export function tokenize(s: string): string[] {
  const out: string[] = [];
  let cur = '',
    q: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === q) q = null;
      else cur += c;
    } else if (c === '"' || c === "'") {
      q = c as any;
    } else if (/\s/.test(c)) {
      if (cur) {
        out.push(cur);
        cur = '';
      }
    } else cur += c;
  }
  if (cur) out.push(cur);
  return out;
}
