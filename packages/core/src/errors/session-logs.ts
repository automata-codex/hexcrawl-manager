export class DayStartMissingError extends Error {
  constructor(public fileHint?: string) {
    super(`Session (${fileHint}) has no day_start event; cannot derive season.`);
    this.name = 'DayStartMissingError';
  }
}

export class SessionLogsNotFoundError extends Error {
  constructor(readonly sessionId: string) {
    super(`No finalized scribe logs found for ${sessionId}.`);
    this.name = 'SessionLogsNotFoundError';
  }
}
