// migrate-hexes.js
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';

// Modify these paths as needed
const inputDir = '../../data/hexes';
const outputDir = '../../data/hexes';

async function migrateHexFiles() {
  const files = await fs.readdir(inputDir);

  for (const file of files) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;

    const filePath = path.join(inputDir, file);
    const fileContents = await fs.readFile(filePath, 'utf8');
    let parsed;

    try {
      parsed = YAML.parse(fileContents);
    } catch (e) {
      console.warn(`Skipping ${file} due to YAML parsing error:`, e.message);
      continue;
    }

    if (!Array.isArray(parsed)) {
      console.warn(`Skipping ${file}: not a list of hexes.`);
      continue;
    }

    for (const hex of parsed) {
      if (!hex.id || !hex.regionId) {
        console.warn(`Skipping hex missing id or regionId in ${file}:`, hex);
        continue;
      }

      hex.slug = hex.id;

      const regionFolder = path.join(outputDir, hex.regionId);
      const hexPath = path.join(regionFolder, `${hex.id}.yaml`);

      await fs.ensureDir(regionFolder);
      await fs.writeFile(hexPath, YAML.stringify(hex), 'utf8');
      console.log(`Wrote: ${hexPath}`);
    }
  }

  console.log('✅ Migration complete!');
}

migrateHexFiles().catch((err) => {
  console.error('❌ Migration failed:', err);
});
