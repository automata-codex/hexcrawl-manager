import { execa } from 'execa';

export interface RunScribeOptions {
  repo: string;
  ensureFinalize?: boolean;
  ensureExit?: boolean;
  env?: Record<string, string>;
  entry?: { cmd: string; args: string[] };
}

export interface RunScribeResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function ensureTrailingCommands(
  cmds: string[],
  ensureFinalize: boolean,
  ensureExit: boolean,
): string[] {
  let result = [...cmds];
  // Remove trailing finalize/exit to avoid duplicates
  while (
    result.length &&
    ['finalize', 'exit'].includes(
      result[result.length - 1].trim().toLowerCase(),
    )
  ) {
    result.pop();
  }
  if (ensureFinalize && ensureExit) {
    result.push('finalize', 'exit');
  } else if (ensureFinalize) {
    result.push('finalize');
  } else if (ensureExit) {
    result.push('exit');
  }
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

  const entry = opts.entry || {
    cmd: 'tsx',
    args: ['cli/skyreach.ts', 'scribe'],
  };

  const env = {
    ...process.env,
    ...opts.env,
    REPO_ROOT: opts.repo,
    FORCE_COLOR: '0',
  };

  try {
    const { stdout, stderr, exitCode } = await execa(entry.cmd, entry.args, {
      cwd: process.cwd(),
      env,
      input,
      reject: false,
      all: false,
    });
    return { stdout, stderr, exitCode: exitCode ?? -1 }; // Tests should fail if exitCode is missing
  } catch (err: any) {
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || '',
      exitCode: typeof err.exitCode === 'number' ? err.exitCode : -1,
    };
  }
}
