import { getRepoPath } from '@skyreach/cli-kit';
import fs from 'fs';
import path from 'path';

const SENTINEL = '.skyreach-test-root';

/**
 * Returns the absolute path to the test repo base directory, creating it and the sentinel file if needed.
 * Uses TEST_REPO_BASE env or defaults to ./.test-repos relative to project root.
 */
export function getTestRepoBase(): string {
  const base = process.env.TEST_REPO_BASE || getRepoPath('.test-repos');
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  const sentinelPath = path.join(base, SENTINEL);
  if (!fs.existsSync(sentinelPath)) {
    fs.writeFileSync(
      sentinelPath,
      'This is a sentinel file for Skyreach test sandboxes.',
    );
  }
  return base;
}

export { SENTINEL as TEST_REPO_SENTINEL };
