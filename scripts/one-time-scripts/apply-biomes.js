/**
 * Reads "biome" from YAML patches and applies them to hexes.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parse, parseDocument } from 'yaml';

const BASE_DIR = '/Users/alexgs/projects/skyreach/data';

const PATCH_FILES = [
  'patches/natural_biome_patch.yaml',
  'patches/natural_biome_patch_100.yaml',
  'patches/natural_biome_patch_200.yaml',
  'patches/natural_biome_patch_300.yaml',
  'patches/natural_biome_patch_400.yaml',
  'patches/natural_biome_patch_500.yaml',
  'patches/natural_biome_patch_final.yaml',
];

const HEX_ROOT = 'hexes';

function applyPatch(patchPath) {
  const patchYaml = readFileSync(join(BASE_DIR, patchPath), 'utf8');
  const patchEntries = parse(patchYaml);

  for (const entry of patchEntries) {
    const filePath = join(BASE_DIR, HEX_ROOT, entry.path);
    if (!existsSync(filePath)) {
      console.warn(`Skipping missing file: ${filePath}`);
      continue;
    }

    try {
      const raw = readFileSync(filePath, 'utf8');
      const doc = parseDocument(raw);

      doc.set('biome', entry.biome);

      writeFileSync(filePath, doc.toString(), "utf8");
      console.log(`Updated: ${filePath}`);
    } catch (err) {
      console.error(`Error processing ${filePath}:`, err.message);
    }
  }
}

for (const patch of PATCH_FILES) {
  applyPatch(patch);
}
