import yaml from 'yaml';

import { atomicWrite } from './atomic-write';

/**
 * Write a YAML file atomically.
 * @param filePath
 * @param data
 */
export function writeYamlAtomic(filePath: string, data: any) {
  const yamlStr = yaml.stringify(data);
  atomicWrite(filePath, yamlStr);
}
