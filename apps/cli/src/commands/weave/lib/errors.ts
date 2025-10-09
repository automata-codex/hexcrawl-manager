export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}


/** User tried to apply a file we've already applied (maps to exit 3). */
export class AlreadyAppliedError extends CliError {
  constructor(message = 'File already applied.') {
    super(message);
    this.name = 'AlreadyAppliedError';
  }
}

/** Input is valid YAML but violates chronology/semantics (maps to exit 4). */
export class ChronologyValidationError extends CliError {
  constructor(message: string) {
    super(message);
    this.name = 'ChronologyValidationError';
  }
}
/** Thrown when user input or file contents are invalid (exit code 4). */
export class CliValidationError extends CliError {
  constructor(message: string) {
    super(message);
    this.name = 'CliValidationError';
  }
}

export class IoApplyError extends CliError {
  constructor(message: string) {
    super(message);
    this.name = 'IoApplyError';
  }
}

/** Nothing to apply (maps to exit code 5). */
export class NoChangesError extends CliError {
  constructor(message = 'No changes would be made.') {
    super(message);
    this.name = 'NoChangesError';
  }
}
