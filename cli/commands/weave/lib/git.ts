import { execSync } from 'child_process';

/**
 * Returns the current git HEAD commit SHA, or null if not in a git repo.
 */
export function getGitHeadCommit(): string | null {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

/**
 * Returns true if the git working directory is dirty (has uncommitted changes).
 */
export function isGitDirty(): boolean {
  try {
    const output = execSync('git status --porcelain', { encoding: 'utf8' });
    return output.trim().length > 0;
  } catch (e) {
    return true;
  }
}
