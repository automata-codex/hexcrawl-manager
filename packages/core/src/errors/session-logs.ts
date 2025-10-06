export class SessionLogsNotFoundError extends Error {
  constructor(readonly sessionId: string) {
    super(`No finalized scribe logs found for ${sessionId}.`);
    this.name = 'SessionLogsNotFoundError';
  }
}
