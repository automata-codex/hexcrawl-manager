/**
 * Routes configuration loader for data/routes.yml
 */

import path from 'node:path';

import { RoutesConfigSchema, type RoutesConfigData } from '@skyreach/schemas';

import { readAndValidateYaml } from './fs-utils';
import { loadConfig } from './load-config';

/**
 * Load and validate routes.yml from the data directory.
 * @throws DataFileNotFoundError if file not found
 * @throws DataValidationError if validation fails
 */
export function loadRoutesConfig(): RoutesConfigData {
  const config = loadConfig({ throwIfMissing: true })!;
  const filePath = path.join(config.repoRoot, 'data', 'routes.yml');
  return readAndValidateYaml(filePath, RoutesConfigSchema);
}
