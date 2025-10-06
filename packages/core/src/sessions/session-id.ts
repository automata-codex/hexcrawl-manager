import { SessionIdError } from '../errors';

const SESSION_ID_RE = /^session-\d{4}$/;

/** Asserting validator (throws on bad input) */
export function assertSessionId(value: string): void {
  if (!isSessionId(value)) {
    throw new SessionIdError(value);
  }
}

/** Type guard (non-throwing) */
export function isSessionId(value: string): boolean {
  return SESSION_ID_RE.test(value);
}
