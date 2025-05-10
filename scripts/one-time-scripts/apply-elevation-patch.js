/**
 * Applies elevation data to hex files
 */
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parse, stringify } from 'yaml';

const hexRootDir = '/Users/alexgs/projects/skyreach/data/hexes';
const patchDir = '/Users/alexgs/projects/skyreach/data/patches/elevation';

function findHexFile(hexId) {
  const regionDirs = readdirSync(hexRootDir);
  for (const regionDir of regionDirs) {
    const regionPath = join(hexRootDir, regionDir);
    if (!statSync(regionPath).isDirectory()) continue;

    const hexPath = join(regionPath, `${hexId}.yaml`);
    if (existsSync(hexPath)) return hexPath;
  }
  return null;
}

let totalUpdated = 0;
const patchFiles = readdirSync(patchDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

for (const patchFile of patchFiles) {
  const patchPath = join(patchDir, patchFile);
  const patch = parse(readFileSync(patchPath, 'utf8'));

  let updated = 0;
  for (const [hexId, elevData] of Object.entries(patch)) {
    const filePath = findHexFile(hexId);
    if (!filePath) {
      console.warn(`⚠️ Missing file for ${hexId}`);
      continue;
    }

    const original = parse(readFileSync(filePath, 'utf8'));
    original.minElevation = elevData.minElevation;
    original.maxElevation = elevData.maxElevation;
    original.avgElevation = elevData.avgElevation;

    writeFileSync(filePath, stringify(original));
    updated++;
  }

  console.log(`✅ ${patchFile}: updated ${updated} hex files.`);
  totalUpdated += updated;
}

console.log(`🎉 Done. Total files updated: ${totalUpdated}`);
