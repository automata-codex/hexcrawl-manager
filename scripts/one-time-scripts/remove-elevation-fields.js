// scripts/remove-elevation-fields.js
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const HEX_DIR = 'data/hexes';

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const doc = yaml.parseDocument(content);
  const data = doc.toJSON();

  let modified = false;

  if ('elevation' in data) {
    delete data.elevation;
    modified = true;
  }
  if ('minElevation' in data) {
    delete data.minElevation;
    modified = true;
  }
  if ('maxElevation' in data) {
    delete data.maxElevation;
    modified = true;
  }
  if ('avgElevation' in data) {
    delete data.avgElevation;
    modified = true;
  }
  if ('vegetation' in data) {
    delete data.vegetation;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, yaml.stringify(data));
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      processFile(fullPath);
    }
  }
}

walkDir(HEX_DIR);
console.log('Done!');
