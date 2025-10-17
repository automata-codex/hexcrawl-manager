import type readline from 'node:readline';

interface MaybeOverrideOpts<T> {
  placeholder?: string;

  // If provided, parse/validate the input and return T
  // eslint-disable-next-line no-unused-vars
  parse?: (raw: string) => T;

  // REQUIRED when interactive: the active REPL readline.Interface
  rl?: readline.Interface;

  // If provided, validate raw input; return string message or void
  // eslint-disable-next-line no-unused-vars
  validate?: (raw: string) => string | Error | undefined;
}

export class UserCanceledError extends Error {
  constructor(msg = 'Canceled by user') {
    super(msg);
  }
}

export function isInteractive(): boolean {
  return (
    process.stdout.isTTY &&
    process.stdin.isTTY &&
    !process.env.CI &&
    process.env.NON_INTERACTIVE !== '1'
  );
}

/**
 * Ask a single line via the provided readline.Interface.
 * Handles Ctrl+C as cancel, restoring prior SIGINT behavior.
 */
async function askLine(
  rl: readline.Interface,
  message: string,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const onSigint = () => {
      cleanup();
      reject(new UserCanceledError());
    };

    // stash existing SIGINT listeners to restore after the question
    const prevSigint = process.listeners('SIGINT');
    process.removeAllListeners('SIGINT');
    process.once('SIGINT', onSigint);

    const cleanup = () => {
      process.removeListener('SIGINT', onSigint);
      // restore previous SIGINT listeners
      for (const l of prevSigint) process.on('SIGINT', l as any);
    };

    rl.question(message, (answer) => {
      cleanup();
      resolve(answer ?? '');
    });
  });
}

/**
 * Show a computed value and let the user optionally override it.
 * Enter = accept computed. Ctrl+C = cancel (throws).
 */
export async function maybeOverride<T>(
  label: string,
  computed: T,
  opts?: MaybeOverrideOpts<T>,
): Promise<T> {
  if (!isInteractive() || !opts?.rl) return computed;

  const prompt = () =>
    askLine(
      opts.rl!,
      `${label}\n(Leave blank to accept: ${String(computed)}${opts?.placeholder ? ` — ${opts.placeholder}` : ''})\n> `,
    );

  // simple retry loop for validation
  while (true) {
    const raw = await prompt();
    if (raw === '') return computed;

    if (opts?.validate) {
      const v = opts.validate(raw);
      if (typeof v === 'string') {
        console.log(v);
        continue;
      }
      if (v instanceof Error) {
        console.log(v.message);
        continue;
      }
    }

    return opts?.parse ? opts.parse(raw) : (raw as unknown as T);
  }
}

/**
 * Pick a file from a list. If exactly one, auto-select (unless disabled).
 * Uses numbered menu on the existing REPL.
 */
export async function selectFromFiles(
  files: { label: string; value: string }[],
  opts?: {
    title?: string;
    autoSelectSingle?: boolean;
    rl?: readline.Interface;
  },
): Promise<string> {
  const autoSelect = opts?.autoSelectSingle ?? true;
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('No files to select from.');
  }
  if (!isInteractive() || !opts?.rl) return files[0].value;
  if (autoSelect && files.length === 1) return files[0].value;

  const rl = opts.rl;

  console.log(opts?.title ?? 'Select a file:');
  files.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.label}`);
  });

  while (true) {
    const raw = await askLine(rl, `Enter number (1-${files.length}): `);
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= files.length) {
      return files[n - 1].value;
    }
    console.log('Invalid selection.');
  }
}

/**
 * Minimal spinner for brief work.
 */
export function spinner(text: string) {
  const frames = ['⠋', '⠙', '⠸', '⠴', '⠦', '⠇'];
  let i = 0;
  let active = true;

  const write = (msg: string) => {
    if (!process.stdout.isTTY) return;
    process.stdout.write(`\r${msg}   `);
  };

  write(`${frames[i % frames.length]} ${text}`);
  const timer = setInterval(() => {
    if (!active) return;
    i++;
    write(`${frames[i % frames.length]} ${text}`);
  }, 80);

  return {
    stop: (msg?: string) => {
      active = false;
      clearInterval(timer);
      if (process.stdout.isTTY) {
        process.stdout.write('\r');
        process.stdout.clearLine(0);
      }
      console.log(msg ?? 'Done');
    },
  };
}
