/**
 * Sidebar configuration loader for data/sidebar.yml
 */

import path from 'node:path';

import { SidebarConfigSchema, type SidebarConfigData } from '@skyreach/schemas';

import { readAndValidateYaml } from './fs-utils';
import { loadConfig } from './load-config';

/**
 * Load and validate sidebar.yml from the data directory.
 * @throws DataFileNotFoundError if file not found
 * @throws DataValidationError if validation fails
 */
export function loadSidebarConfig(): SidebarConfigData {
  const config = loadConfig({ throwIfMissing: true })!;
  const filePath = path.join(config.repoRoot, 'data', 'sidebar.yml');
  return readAndValidateYaml(filePath, SidebarConfigSchema);
}
