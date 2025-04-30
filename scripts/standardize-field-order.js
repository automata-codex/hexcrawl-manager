import pkg from 'fs-extra';
import { parse, stringify } from 'yaml';
import { globby } from 'globby';

const { readFile, writeFile, readJson } = pkg;

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error('❌ Usage: node standardize-field-order.js path/to/config.json');
    process.exit(1);
  }

  // 🔧 Load config file
  const config = await readJson(configPath);
  const { targetGlob, fieldOrder } = config;

  if (!targetGlob || !Array.isArray(fieldOrder)) {
    console.error('❌ Config must include \'targetGlob\' and \'fieldOrder\' array.');
    process.exit(1);
  }

  // 🔍 Find matching YAML/YML files
  const paths = await globby(targetGlob);
  console.log(`🔍 Found ${paths.length} files to normalize.`);

  for (const filePath of paths) {
    try {
      const content = await readFile(filePath, 'utf8');
      const parsed = parse(content);
      if (!parsed || typeof parsed !== 'object') continue;

      const reordered = reorderFields(parsed, fieldOrder);
      const newYaml = stringify(reordered);
      await writeFile(filePath, newYaml);

      console.log(`✅ Normalized: ${filePath}`);
    } catch (err) {
      console.warn(`⚠️ Failed: ${filePath}: ${err.message}`);
    }
  }

  console.log("✨ Done.");
}

// 🔁 Utility to reorder fields
function reorderFields(obj, preferredOrder) {
  const ordered = {};
  for (const key of preferredOrder) {
    if (key in obj) {
      ordered[key] = obj[key];
    }
  }
  for (const key of Object.keys(obj)) {
    if (!preferredOrder.includes(key)) {
      ordered[key] = obj[key];
    }
  }
  return ordered;
}

await main();
