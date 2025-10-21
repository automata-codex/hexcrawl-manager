import { glob } from 'glob';
import path from 'node:path';

export function buildHexFileIndex(root = 'data/hexes'): Record<string, string> {
  const files = glob.sync(path.join(root, '**/*.yml'));
  const index: Record<string, string> = {};

  for (const file of files) {
    const hexId = path.basename(file, '.yml'); // <hexId>.yml
    // defensive: normalize to lowercase, as per HexId rules
    const id = hexId.toLowerCase();
    index[id] = path.resolve(file);
  }

  return index;
}
