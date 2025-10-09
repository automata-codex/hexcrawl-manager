export class SessionIdError extends Error {
  constructor(readonly value: string) {
    super(`Invalid sessionId: ${value}. Expected format is 'session-####'.`);
    this.name = 'SessionIdError';
  }
}

