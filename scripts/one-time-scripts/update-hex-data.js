import { readFile, ensureDir, writeFile } from 'fs-extra';
import { join } from 'path';
import { parse, stringify } from 'yaml';
import globby from 'globby';

// 🛠️ Configurable constants
const INPUT_FILES = [
  '/Users/alexgs/projects/skyreach/data/map-migration/map-hexes-a-to-d.yaml',
  '/Users/alexgs/projects/skyreach/data/map-migration/map-hexes-e-to-h.yaml',
  '/Users/alexgs/projects/skyreach/data/map-migration/map-hexes-i-to-l.yaml',
  '/Users/alexgs/projects/skyreach/data/map-migration/map-hexes-m-to-r.yaml',
  '/Users/alexgs/projects/skyreach/data/map-migration/map-hexes-s-to-w.yaml',
];
const DATA_DIR = '/Users/alexgs/projects/skyreach/data';
const MISSING_HEX_DIR = join(DATA_DIR, 'hexes-to-be-placed');

// 🔍 Load all hex YAML entries from input files
async function loadHexEntries() {
  const allEntries = [];
  for (const file of INPUT_FILES) {
    const content = await readFile(file, 'utf8');
    const parsed = parse(content);
    allEntries.push(...parsed);
  }
  return allEntries;
}

// 🗂️ Find all existing hex YAML/YML files in region folders
async function findExistingHexFiles(dataDir) {
  const paths = await globby(`${dataDir}/hexes/**/*.{yaml,yml}`);
  const hexMap = new Map();
  for (const filePath of paths) {
    const contents = await readFile(filePath, 'utf8');
    try {
      const doc = parse(contents);
      if (doc?.id) {
        hexMap.set(doc.id.toLowerCase(), filePath);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to parse ${filePath}: ${err.message}`);
    }
  }
  return hexMap;
}

// 🧠 Merge or create hex files
async function processHexes(hexEntries, hexMap) {
  await ensureDir(MISSING_HEX_DIR);

  for (const entry of hexEntries) {
    const { hex, terrain, vegetation } = entry;
    const filepath = hexMap.get(hex.toLowerCase());

    if (filepath) {
      const doc = parse(await readFile(filepath, 'utf8')) || {};
      doc.terrain = terrain;
      doc.vegetation = vegetation;
      await writeFile(filepath, stringify(doc));
      console.log(`✅ Updated ${filepath}`);
    } else {
      const filename = `${hex}.yaml`;
      const newPath = join(MISSING_HEX_DIR, filename);
      const newDoc = {
        id: hex,
        terrain,
        vegetation,
      };
      await writeFile(newPath, stringify(newDoc));
      console.log(`➕ Created ${newPath}`);
    }
  }
}

// 🚀 Main
(async () => {
  try {
    const hexEntries = await loadHexEntries();
    const existingHexMap = await findExistingHexFiles(DATA_DIR);
    await processHexes(hexEntries, existingHexMap);
    console.log("✨ Done.");
  } catch (err) {
    console.error("💥 Error:", err);
  }
})();
