import { execa } from 'execa';
import path from 'path';

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
