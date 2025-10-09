import  { type MetaData, MetaSchema } from '@skyreach/schemas';

import { writeYamlAtomic } from './atomic-write';
import { readAndValidateYaml } from './fs-utils';
import { REPO_PATHS } from './repo-paths';

/**
 * Loads the meta.yaml file and returns its contents as MetaData.
 */
export function loadMeta(): MetaData {
  return readAndValidateYaml(REPO_PATHS.META(), MetaSchema);
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
