import { normalizeHexId } from '@achm/core';
import { padSessionNum } from '@achm/schemas';

export class DataFileNotFoundError extends Error {
  constructor(public filepath: string) {
    super(`Data file not found: ${filepath}`);
    this.name = 'DataFileNotFoundError';
  }
}

export class DataParseError extends Error {
  constructor(
    public filepath: string,
    public cause?: unknown,
  ) {
    super(`Failed to parse YAML: ${filepath}`, { cause });
    this.name = 'DataParseError';
  }
}

export class DataValidationError extends Error {
  constructor(
    public filepath: string,
    public issues: unknown,
  ) {
    super(`YAML failed validation: ${filepath}`);
    this.name = 'DataValidationError';
  }
}

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

export class HexFileNotFoundError extends Error {
  constructor(public hexId: string) {
    super(`Hex file not found for hexId "${normalizeHexId(hexId)}"`);
    this.name = 'HexFileNotFoundError';
  }
}
