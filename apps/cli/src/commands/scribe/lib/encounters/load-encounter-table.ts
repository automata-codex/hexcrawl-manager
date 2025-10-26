import { readAndValidateYaml, resolveDataPath } from '@skyreach/data';
import { EncounterTableSchema } from '@skyreach/schemas';

import type { EncounterTableData } from '@skyreach/schemas';

/**
 * Load the default encounter table.
 */
export function loadEncounterTable(): EncounterTableData {
  const encounterTablePath = resolveDataPath('default-encounter-table.yaml');
  return readAndValidateYaml(encounterTablePath, EncounterTableSchema);
}
