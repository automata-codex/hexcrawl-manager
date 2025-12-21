import {
  clearDataPathCache,
  ensureRepoDirs,
  getDataPath,
  REPO_PATHS,
} from '@skyreach/data';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';

import { getTestRepoBase, TEST_REPO_SENTINEL } from './get-test-repo-base.js';

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// Helper to get the caller's file (non-deprecated, works in CJS/ESM)
function getCallerFile(depth = 2): string | undefined {
  const origPrepareStackTrace = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = (_, stack) => stack;
    const err = new Error();
    const stack = err.stack as unknown as NodeJS.CallSite[];
    // depth=2: 0=this fn, 1=withTempRepo, 2=caller
    const callSite = stack[depth];
    if (!callSite) return undefined;
    return callSite.getFileName() || undefined;
  } finally {
    Error.prepareStackTrace = origPrepareStackTrace;
  }
}

async function runGitInit(repoPath: string) {
  await new Promise((resolve, reject) => {
    const proc = spawn('git', ['init'], { cwd: repoPath });
    proc.on('exit', (code) =>
      code === 0 ? resolve(null) : reject(new Error('git init failed')),
    );
    proc.on('error', reject);
  });
  await fs.writeFile(path.join(repoPath, '.gitignore'), '');
  await new Promise((resolve, reject) => {
    const proc = spawn('git', ['add', '.'], { cwd: repoPath });
    proc.on('exit', (code) =>
      code === 0 ? resolve(null) : reject(new Error('git add failed')),
    );
    proc.on('error', reject);
  });
  await new Promise((resolve, reject) => {
    const proc = spawn(
      'git',
      [
        '-c',
        'user.name=Test User',
        '-c',
        'user.email=test@example.com',
        'commit',
        '-m',
        'seed sandbox',
      ],
      { cwd: repoPath },
    );
    proc.on('exit', (code) =>
      code === 0 ? resolve(null) : reject(new Error('git commit failed')),
    );
    proc.on('error', reject);
  });
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function withTempRepo<T = string>(
  title?: string,
  opts?: { initGit?: boolean; keepOnFailEnv?: string },
  fn?: (repoPath: string) => Promise<T>,
): Promise<T | string> {
  const base = getTestRepoBase();
  const sentinel = path.join(base, TEST_REPO_SENTINEL);
  if (!(await fileExists(sentinel))) {
    throw new Error(`Sentinel file missing in test repo base: ${base}`);
  }
  const callerFile = getCallerFile(2);
  const suite = callerFile
    ? path.basename(callerFile, path.extname(callerFile))
    : 'sandbox';
  const slug = slugify(title || 'sandbox');
  const ts = Date.now();
  const repoPath = path.join(base, suite, `${slug}-${ts}`);

  // Save previous data path and set ACHM_DATA_PATH to sandbox path for this test
  const prevDataPath = process.env.ACHM_DATA_PATH ?? getDataPath();
  clearDataPathCache();
  process.env.ACHM_DATA_PATH = repoPath;

  // Ensure required directories using REPO_PATHS
  ensureRepoDirs();

  // Seed required files
  await fs.writeFile(
    REPO_PATHS.META(),
    yaml.stringify({
      version: 2,
      nextSessionSeq: 27,
      state: {
        trails: {
          backend: 'meta',
          applied: {
            sessions: [],
            seasons: [],
          },
        },
        ap: {
          backend: 'ledger',
        },
      },
    }),
  );
  await fs.writeFile(REPO_PATHS.HAVENS(), yaml.stringify([]));
  await fs.writeFile(REPO_PATHS.TRAILS(), yaml.stringify({}));

  // Initialize git repo if needed
  if (opts?.initGit) {
    await runGitInit(repoPath);
  }

  let keep = false;
  let result: T | string;
  const keepEnv = opts?.keepOnFailEnv || 'KEEP_TEST_REPOS';
  try {
    if (fn) {
      result = await fn(repoPath);
    } else {
      result = repoPath;
    }
  } catch (err) {
    keep = true;

    console.error(`Sandbox preserved at ${repoPath}`);
    throw err;
  } finally {
    clearDataPathCache();
    process.env.ACHM_DATA_PATH = prevDataPath;
    if (!keep && !process.env[keepEnv]) {
      // Only delete if sentinel exists
      if (await fileExists(sentinel)) {
        await fs.rm(repoPath, { recursive: true, force: true });
      }
    }
  }
  return result;
}
