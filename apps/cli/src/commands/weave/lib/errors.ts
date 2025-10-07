export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

/** Thrown when user input or file contents are invalid (exit code 4). */
export class CliValidationError extends CliError {
  constructor(message: string) {
    super(message);
    this.name = 'CliValidationError';
  }
}
