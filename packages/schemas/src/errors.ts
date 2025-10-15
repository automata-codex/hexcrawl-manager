// eslint-disable-next-line no-undef
type CallSite = NodeJS.CallSite;

export function getCaller(skip = 0): CallSite | undefined {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack; // stack: CallSite[]
  const err = new Error();
  Error.captureStackTrace(err, getCaller);
  const stack = err.stack as unknown as CallSite[];
  Error.prepareStackTrace = orig;
  // skip our helper + (optional) extra frames
  return stack[1 + skip];
}

export function formatCallSite(cs?: CallSite): string | undefined {
  if (!cs) return;
  const file = cs.getFileName?.() ?? '<unknown>';
  const line = cs.getLineNumber?.();
  const col = cs.getColumnNumber?.();
  return `${file}:${line}:${col}`;
}

export class WithCallsiteError extends Error {
  constructor(message: string, skip = 0) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    for (let i = skip; i > 0; i--) {
      const where = formatCallSite(getCaller(skip));
      if (where) {
        this.message = `${this.message}\n  - ${i}: ${where}`;
      }
    }
  }
}

export class SessionIdError extends WithCallsiteError {
  constructor(readonly value: string) {
    super(`Invalid sessionId: ${value}. Expected format is 'session-####'.`, 2);
    this.name = 'SessionIdError';
  }
}
