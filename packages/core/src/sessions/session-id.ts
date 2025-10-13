import { SESSION_ID_RE, SessionIdError, padSessionNum } from '@skyreach/schemas';

/**
 * @deprecated Use function from `@skyreach/schemas` instead.
 * Asserting validator (throws on bad input)
 */
export function assertSessionId(value: string): string {
  if (!isSessionId(value)) {
    throw new SessionIdError(value);
  }
  return value;
}

/**
 * @deprecated Use function `makeSessionId` from `@skyreach/schemas` instead.
 */
export function buildSessionId(
  sessionNumber: number,
  suffix?: string,
): string {
  return `session-${padSessionNum(sessionNumber)}${suffix ?? ''}`;
}

/**
 * @deprecated Use function from `@skyreach/schemas` instead.
 * Type guard (non-throwing)
 */
export function isSessionId(value: string): boolean {
  return SESSION_ID_RE.test(value);
}
