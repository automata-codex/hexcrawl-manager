/**
 * Sidebar configuration loader for data/sidebar.yml
 */

import { SidebarConfigSchema, type SidebarConfigData } from '@skyreach/schemas';

import { readAndValidateYaml } from './fs-utils.js';
import { resolveDataPath } from './paths.js';

/**
 * Load and validate sidebar.yml from the data directory.
 * @throws DataFileNotFoundError if file not found
 * @throws DataValidationError if validation fails
 */
export function loadSidebarConfig(): SidebarConfigData {
  const filePath = resolveDataPath('sidebar.yml');
  return readAndValidateYaml(filePath, SidebarConfigSchema);
}
