import { normalizeHexId } from '@skyreach/core';
import { REPO_PATHS } from '@skyreach/data';
import { glob } from 'glob';
import path from 'node:path';

export function buildHexFileIndex(
  root = REPO_PATHS.HEXES(),
): Record<string, string> {
  const files = glob.sync(path.join(root, '**/*.yml'));
  const index: Record<string, string> = {};

  for (const file of files) {
    const hexId = path.basename(file, '.yml'); // <hexId>.yml
    index[normalizeHexId(hexId)] = path.resolve(file);
  }

  return index;
}
