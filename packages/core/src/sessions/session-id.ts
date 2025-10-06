import { SessionIdError } from '../errors';

const SESSION_ID_RE = /^session-\d{4}$/;

/** Asserting validator (throws on bad input) */
export function assertSessionId(value: string): string {
  if (!isSessionId(value)) {
    throw new SessionIdError(value);
  }
  return value;
}

/** Type guard (non-throwing) */
export function isSessionId(value: string): boolean {
  return SESSION_ID_RE.test(value);
}
