/**
 * Routes configuration loader for data/routes.yml
 */

import { RoutesConfigSchema, type RoutesConfigData } from '@skyreach/schemas';

import { readAndValidateYaml } from './fs-utils';
import { resolveDataPath } from './paths';

/**
 * Load and validate routes.yml from the data directory.
 * @throws DataFileNotFoundError if file not found
 * @throws DataValidationError if validation fails
 */
export function loadRoutesConfig(): RoutesConfigData {
  const filePath = resolveDataPath('routes.yml');
  return readAndValidateYaml(filePath, RoutesConfigSchema);
}
