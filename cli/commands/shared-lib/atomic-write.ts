import fs from 'node:fs';
import yaml from 'yaml';

/**
 * Write a file atomically: write to a temp file, then rename.
 * Ensures that the file is either fully written or not present.
 */
export function atomicWrite(filePath: string, content: string) {
  const tmpPath = filePath + '.' + Math.random().toString(36).slice(2) + '.tmp';
  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

export function writeYamlAtomic(filePath: string, data: any) {
  const yamlStr = yaml.stringify(data);
  atomicWrite(filePath, yamlStr);
}
