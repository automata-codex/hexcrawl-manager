import { MapConfigSchema, type MapConfig } from '@achm/schemas';
import fs from 'fs';

import { readAndValidateYaml } from './fs-utils.js';
import { REPO_PATHS } from './repo-paths.js';

/**
 * Load and validate map configuration from map.yaml.
 * @throws Error if file doesn't exist or fails validation
 */
export function loadMapConfig(): MapConfig {
  // Type assertion needed because readAndValidateYaml infers input type,
  // but MapConfig is the output type (after .default() is applied by Zod)
  return readAndValidateYaml(
    REPO_PATHS.MAP_CONFIG(),
    MapConfigSchema,
  ) as MapConfig;
}

/**
 * Check if map.yaml exists without throwing an error.
 */
export function mapConfigExists(): boolean {
  return fs.existsSync(REPO_PATHS.MAP_CONFIG());
}
