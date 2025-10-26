import { normalizeHexId } from '@skyreach/core';
import { REPO_PATHS } from '@skyreach/data';
import { glob } from 'glob';
import path from 'node:path';

/**
 * Build an index mapping normalized hex IDs to their file paths.
 * Supports both .yml and .yaml extensions.
 */
export function buildHexFileIndex(
  root = REPO_PATHS.HEXES(),
): Record<string, string> {
  // Support both .yml and .yaml extensions
  const files = [
    ...glob.sync(path.join(root, '**/*.yml')),
    ...glob.sync(path.join(root, '**/*.yaml')),
  ];
  const index: Record<string, string> = {};

  for (const file of files) {
    const ext = path.extname(file);
    const hexId = path.basename(file, ext);
    index[normalizeHexId(hexId)] = path.resolve(file);
  }

  return index;
}
