import { execa } from 'execa';
import path from 'path';

export interface RunWeaveOptions {
  repo: string;
  env?: Record<string, string>;
  entry?: { cmd: string; args: string[] };
  /** Number of retry attempts for transient failures (default: 2) */
  retries?: number;
}

export interface RunWeaveResult {
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

export async function runWeave(
  args: string[],
  opts: RunWeaveOptions,
): Promise<RunWeaveResult> {
  const entry = opts.entry || {
    cmd: 'tsx',
    args: ['src/hexcrawl.ts', 'weave'],
  };
  const maxAttempts = (opts.retries ?? 2) + 1;

  const env = {
    ...process.env,
    ...opts.env,
    ACHM_DATA_PATH: path.join(opts.repo, 'data'),
    FORCE_COLOR: '0',
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { stdout, stderr, exitCode } = await execa(
        entry.cmd,
        [...entry.args, ...args],
        {
          cwd: process.cwd(),
          env,
          reject: false,
          all: false,
        },
      );

      const code = exitCode ?? 0;

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
