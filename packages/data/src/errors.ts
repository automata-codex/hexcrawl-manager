import { padSessionNum } from '@skyreach/core';

export class DirtyGitError extends Error {
  constructor() {
    super(
      'Working tree has uncommitted changes. Commit or stash changes, or use --allow-dirty.',
    );
    this.name = 'DirtyGitError';
  }
}

export class FinalizedLogJsonParseError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly line: number,
    public readonly cause?: unknown,
  ) {
    super(`Malformed JSON in ${filePath} at line ${line}.`);
    this.name = 'FinalizedLogJsonParseError';
    (this as any).cause = cause;
  }
}

export class FinalizedLogsNotFoundError extends Error {
  constructor(public readonly sessionNumber: string | number) {
    super(
      `No finalized scribe logs found for session ${padSessionNum(sessionNumber)}.`,
    );
    this.name = 'FinalizedLogsNotFoundError';
  }
}

