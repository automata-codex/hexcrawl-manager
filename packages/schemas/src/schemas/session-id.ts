import { z } from 'zod';

import { SessionIdError } from '../errors';
import { SESSION_ID_RE } from '../regex';

export const SessionIdSchema = z
  .string()
  .regex(SESSION_ID_RE, 'Invalid SessionId format')
  .brand<'SessionId'>();

export type SessionId = z.infer<typeof SessionIdSchema>;

export function assertSessionId(value: string): SessionId {
  if (!isSessionId(value)) {
    throw new SessionIdError(value);
  }
  return SessionIdSchema.parse(value);
}

export const isSessionId = (value: string): boolean =>
  SessionIdSchema.safeParse(value).success;

export const makeSessionId = (
  number: SessionId | number | string,
): SessionId => {
  // If already a valid SessionId, return it as-is (idempotent)
  if (typeof number === 'string' && isSessionId(number)) {
    return number as SessionId;
  }

  const core = `session-${padSessionNum(number)}`;
  return SessionIdSchema.parse(core);
};

export function padSessionNum(n: number | string) {
  const str = n.toString().trim();
  if (/^\d{4}$/.test(str)) {
    return str; // already correct
  }

  if (/^\d+$/.test(str)) {
    const digits = str.replace(/^0+/, ''); // strip leading zeros
    return digits.padStart(4, '0').slice(-4); // normalize to 4 digits
  }

  throw new Error(`Invalid session number: ${n}`);
}

export const parseSessionId = (id: SessionId) => {
  const validSessionId = assertSessionId(id);
  const match = SESSION_ID_RE.exec(validSessionId)!;
  return { number: Number(match[1]) };
};
