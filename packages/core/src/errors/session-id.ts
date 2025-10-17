/** @deprecated Use error from `@skyreach/schemas` instead. */
export class SessionIdError extends Error {
  constructor(readonly value: string) {
    super(`Invalid sessionId: ${value}. Expected format is 'session-####'.`);
    this.name = 'SessionIdError';
  }
}
