import { execa } from 'execa';
import path from 'path';

export interface RunScribeOptions {
  repo: string;
  ensureFinalize?: boolean;
  ensureExit?: boolean;
  env?: Record<string, string>;
  entry?: { cmd: string; args: string[] };
  /** Number of retry attempts for transient failures (default: 2) */
  retries?: number;
}

export interface RunScribeResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// Exit codes that indicate transient failures worth retrying
const TRANSIENT_EXIT_CODES = [
  139, // SIGSEGV - can happen due to resource contention with tsx
  137, // SIGKILL - OOM killer
  134, // SIGABRT
];

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureTrailingCommands(
  cmds: string[],
  ensureFinalize: boolean,
  ensureExit: boolean,
): string[] {
  // If we're not ensuring anything, leave the queue exactly as-is.
  if (!ensureFinalize && !ensureExit) {
    return [...cmds];
  }

  const result = [...cmds];
  const toEnsure: string[] = [];
  if (ensureFinalize) toEnsure.push('finalize');
  if (ensureExit) toEnsure.push('exit');

  const isEnsured = (s: string) => toEnsure.includes(s.trim().toLowerCase());

  // Remove only the trailing commands we're going to (re)append,
  // to avoid duplicates without stripping user-supplied ones we aren't managing.
  while (result.length && isEnsured(result[result.length - 1])) {
    result.pop();
  }

  // Append in desired order: finalize then exit (if both requested).
  result.push(...toEnsure);
  return result;
}

export async function runScribe(
  commands: string[],
  opts: RunScribeOptions,
): Promise<RunScribeResult> {
  const ensureFinalize = opts.ensureFinalize !== false;
  const ensureExit = opts.ensureExit !== false;
  let cmds = ensureTrailingCommands(commands, ensureFinalize, ensureExit);
  const input = cmds.join('\n') + '\n';
  const maxAttempts = (opts.retries ?? 2) + 1;

  const entry = opts.entry || {
    cmd: 'tsx',
    args: ['src/hexcrawl.ts', 'scribe'],
  };

  const env = {
    ...process.env,
    ...opts.env,
    ACHM_DATA_PATH: path.join(opts.repo, 'data'),
    FORCE_COLOR: '0',
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { stdout, stderr, exitCode } = await execa(entry.cmd, entry.args, {
        cwd: process.cwd(),
        env,
        input,
        reject: false,
        all: false,
      });

      const code = exitCode ?? -1;

      // Retry on transient failures (unless this is the last attempt)
      if (TRANSIENT_EXIT_CODES.includes(code) && attempt < maxAttempts) {
        await delay(100 * attempt); // Backoff: 100ms, 200ms, etc.
        continue;
      }

      return { stdout, stderr, exitCode: code };
    } catch (err: any) {
      const code = typeof err.exitCode === 'number' ? err.exitCode : -1;

      // Retry on transient failures (unless this is the last attempt)
      if (TRANSIENT_EXIT_CODES.includes(code) && attempt < maxAttempts) {
        await delay(100 * attempt);
        continue;
      }

      return {
        stdout: err.stdout || '',
        stderr: err.stderr || err.message || '',
        exitCode: code,
      };
    }
  }

  // Should never reach here, but TypeScript needs this
  return { stdout: '', stderr: 'Max retries exceeded', exitCode: -1 };
}
