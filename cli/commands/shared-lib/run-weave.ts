import { execa } from 'execa';

export interface RunWeaveOptions {
  repo: string;
  env?: Record<string, string>;
  entry?: { cmd: string; args: string[] };
}

export interface RunWeaveResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runWeave(
  args: string[],
  opts: RunWeaveOptions,
): Promise<RunWeaveResult> {
  const entry = opts.entry || {
    cmd: 'tsx',
    args: ['cli/skyreach.ts', 'weave'],
  };

  const env = {
    ...process.env,
    ...opts.env,
    REPO_ROOT: opts.repo,
    FORCE_COLOR: '0',
  };

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
    return { stdout, stderr, exitCode: exitCode ?? 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || '',
      exitCode: typeof err.exitCode === 'number' ? err.exitCode : -1,
    };
  }
}
