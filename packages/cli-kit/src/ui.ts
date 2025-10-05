import * as prompts from '@clack/prompts';

interface MaybeOverrideOpts<T> {
  placeholder?: string;
  // If provided, parse/validate the input and return T
  // eslint-disable-next-line no-unused-vars
  parse?: (raw: string | symbol) => T;
  // If provided, validate raw input; return string message or void
  // eslint-disable-next-line no-unused-vars
  validate?: (raw: string) => string | Error | undefined;
}

export class UserCanceledError extends Error {
  constructor(msg = 'Canceled by user') { super(msg); }
}

function onCancel(): never {
  prompts.cancel('Cancelled.');
  throw new UserCanceledError();
}

export function isInteractive(): boolean {
  // centralize your non-interactive rules
  return process.stdout.isTTY && !process.env.CI && process.env.NON_INTERACTIVE !== '1';
}

/**
 * Show a computed value and let the user optionally override it.
 * Hit Enter = accept computed. Esc/Ctrl+C = cancel (throws).
 */
export async function maybeOverride<T>(
  label: string,
  computed: T,
  opts?: MaybeOverrideOpts<T>,
): Promise<T> {
  if (!isInteractive()) {
    return computed;
  }

  const input = await prompts.text({
    message: `${label}\n(Leave blank to accept: ${String(computed)})`,
    placeholder: opts?.placeholder,
    validate: opts?.validate,
    initialValue: '', // forces explicit override typing
  }).catch(onCancel);

  if (!input) {
    return computed; // user pressed Enter w/ empty input
  }
  return opts?.parse ? opts.parse(input) : (input as unknown as T);
}

/**
 * Pick a file from a list. If exactly one, auto-select (unless disabled).
 * Returns the selected path.
 */
export async function selectFromFiles(
  files: string[],
  opts?: {
    title?: string;
    autoSelectSingle?: boolean;
  },
): Promise<string> {
  if (files.length === 0) {
    throw new Error('No files to select from.');
  }
  if (!isInteractive() || (opts?.autoSelectSingle ?? true) && files.length === 1) {
    return files[0];
  }

  const value = await prompts.select({
    message: opts?.title ?? 'Select a file',
    options: files.map((f) => ({ label: f, value: f })),
  }).catch(onCancel);

  if (typeof value !== 'string') {
    onCancel();
  }
  return value as string;
}

// Spinner for brief work:
export function spinner(text: string) {
  const s = prompts.spinner();
  s.start(text);
  return {
    stop: (msg?: string) => s.stop(msg ?? 'Done'),
  };
}
