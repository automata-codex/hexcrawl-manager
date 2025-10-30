import { ZodError } from 'zod';

export class SessionAlreadyAppliedError extends Error {
  constructor(readonly sessionId: string) {
    super(`Completed report for ${sessionId} already matches fingerprint.`);
    this.name = 'SessionAlreadyAppliedError';
  }
}

export class SessionFingerprintMismatchError extends Error {
  constructor(readonly sessionId: string) {
    super(
      `Completed report for ${sessionId} has a different fingerprint. Revert the prior apply or use a new session.`,
    );
    this.name = 'SessionFingerprintMismatchError';
  }
}

export class SessionReportValidationError extends Error {
  constructor(
    readonly sessionId: string,
    readonly issues: ZodError['issues'],
  ) {
    super(`Session report for ${sessionId} is invalid.`);
    this.name = 'SessionReportValidationError';
  }
}
