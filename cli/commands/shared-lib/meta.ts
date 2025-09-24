import fs from 'fs';
import yaml from 'yaml';

import { REPO_PATHS } from './constants';
import { writeYamlAtomic } from './index';

import type { MetaData } from '../../../src/types';

/**
 * Loads the meta.yaml file and returns its contents as MetaData.
 */
export function loadMeta(): MetaData {
  const metaPath = REPO_PATHS.META();
  if (!fs.existsSync(metaPath)) {
    throw new Error(`❌ meta.yaml not found at ${metaPath}`);
  }
  const metaRaw = fs.readFileSync(metaPath, 'utf8');
  try {
    return yaml.parse(metaRaw);
  } catch (e) {
    throw new Error(`❌ Failed to parse meta.yaml: ${e}`);
  }
}

/**
 * Saves a partial MetaData object to meta.yaml, merging with the existing data.
 * @param partialMeta Partial MetaData to merge and save.
 */
export function saveMeta(partialMeta: Partial<MetaData>): void {
  const current = loadMeta();
  const merged = { ...current, ...partialMeta };
  writeYamlAtomic(REPO_PATHS.META(), merged);
}
