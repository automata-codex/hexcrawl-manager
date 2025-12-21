import {
  SESSION_ID_RE,
  SessionIdError,
  padSessionNum,
} from '@achm/schemas';

/**
 * @deprecated Use function from `@achm/schemas` instead.
 * Asserting validator (throws on bad input)
 */
export function assertSessionId(value: string): string {
  if (!isSessionId(value)) {
    throw new SessionIdError(value);
  }
  return value;
}

/**
 * @deprecated Use function `makeSessionId` from `@achm/schemas` instead.
 */
export function buildSessionId(sessionNumber: number, suffix?: string): string {
  return `session-${padSessionNum(sessionNumber)}${suffix ?? ''}`;
}

/**
 * @deprecated Use function from `@achm/schemas` instead.
 * Type guard (non-throwing)
 */
export function isSessionId(value: string): boolean {
  return SESSION_ID_RE.test(value);
}
