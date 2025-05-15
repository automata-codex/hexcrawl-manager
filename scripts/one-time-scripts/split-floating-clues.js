/**
 * Splits floating clues from many-per-file structure to a one-per-file structure.
 */

import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';

const targetDir = '../../data/floating-clues'; // Directory containing list-based .yml files

const files = await fs.readdir(targetDir);

for (const file of files) {
  if (!file.endsWith('.yml')) continue;

  const filePath = path.join(targetDir, file);
  const content = await fs.readFile(filePath, 'utf8');
  let parsed;

  try {
    parsed = YAML.parse(content);
  } catch (e) {
    console.warn(`Skipping ${file} due to YAML parsing error:`, e.message);
    continue;
  }

  if (!Array.isArray(parsed)) {
    console.warn(`⚠️ Skipping ${file}: not an array`);
    continue;
  }

  for (const clue of parsed) {
    const singleton = {
      id: clue.id,
      name: clue.name,
      summary: clue.summary,
      reference: clue.reference,
      detailText: clue.detailText,
    };

    const outPath = path.join(targetDir, `${clue.id}.yml`);
    const yaml = YAML.stringify(singleton);
    await fs.writeFile(outPath, yaml, 'utf8');
    console.log(`✅ Wrote ${clue.id}.yml`);
  }

  // Optionally delete the original file or move it to an archive folder
  // await fs.unlink(filePath);
  // console.log(`🗑 Removed original file: ${file}`);
}

console.log('✅ Migration complete.');
