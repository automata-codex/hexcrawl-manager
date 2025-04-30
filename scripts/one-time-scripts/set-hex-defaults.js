import pkg from 'fs-extra';
import { basename, extname } from 'path';
import { parse, stringify } from 'yaml';
import { globby } from 'globby';

const { readFile, writeFile } = pkg;

// ✅ Static default values
const DEFAULTS = {
  name: 'unknown',
  landmark: 'unknown',
};

// 🧠 Add any missing fields from DEFAULTS
function applyDefaults(obj, defaults) {
  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in obj)) {
      obj[key] = value;
    }
  }
  return obj;
}

// 📁 Derive region from path like "data/hexes/region-9/r14.yml"
function extractRegionId(filePath) {
  const match = filePath.match(/region-(\d+)/);
  return match ? `region-${match[1]}` : null;
}

// 🔠 Derive slug/id from filename (e.g. r14.yml → r14)
function extractSlugAndId(filePath) {
  return basename(filePath, extname(filePath));
}

// 🚀 Main
(async () => {
  const paths = await globby('../../data/hexes/region-*/*.{yaml,yml}');
  console.log(`🔍 Found ${paths.length} hex files.`);

  for (const filePath of paths) {
    try {
      const content = await readFile(filePath, 'utf8');
      const parsed = parse(content);
      if (!parsed || typeof parsed !== 'object') continue;

      const slug = extractSlugAndId(filePath);
      const regionId = extractRegionId(filePath);

      // Fill in all other required defaults if missing
      const updated = applyDefaults(parsed, {
        ...DEFAULTS,
        id: slug,
        regionId,
        slug,
      });

      await writeFile(filePath, stringify(updated));
      console.log(`✅ Updated: ${filePath}`);
    } catch (err) {
      console.warn(`⚠️ Failed to process ${filePath}: ${err.message}`);
    }
  }

  console.log("✨ Done adding default values to hex files.");
})();
