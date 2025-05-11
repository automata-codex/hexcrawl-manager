/**
 * Renames the `avgElevation` field to `elevation` in all hex YAML files and
 * removes other elevation fields (and `vegetation`).
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const hexRootDir = '/Users/alexgs/projects/skyreach/data/hexes';

function transformHexData(data) {
  if (data.avgElevation !== undefined) {
    data.elevation = data.avgElevation;
    delete data.avgElevation;
  }

  delete data.minElevation;
  delete data.maxElevation;
  delete data.vegetation;

  return data;
}

function processYamlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = yaml.parseDocument(content);

  const updated = transformHexData(parsed.toJSON());
  const newYaml = yaml.stringify(updated);

  fs.writeFileSync(filePath, newYaml, 'utf8');
  console.log(`✅ Updated ${path.relative(hexRootDir, filePath)}`);
}

function walkDirAndProcess(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walkDirAndProcess(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
      processYamlFile(fullPath);
    }
  }
}

function run() {
  walkDirAndProcess(hexRootDir);
  console.log('🎉 All hex files processed.');
}

run();
