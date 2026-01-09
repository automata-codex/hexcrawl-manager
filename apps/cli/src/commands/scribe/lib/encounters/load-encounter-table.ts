import { readAndValidateYaml, resolveDataPath } from '@achm/data';
import { EncounterTableSchema } from '@achm/schemas';

import type { EncounterTableData } from '@achm/schemas';

/**
 * Load the default encounter table.
 */
export function loadEncounterTable(): EncounterTableData {
  const encounterTablePath = resolveDataPath('default-encounter-table.yaml');
  return readAndValidateYaml(encounterTablePath, EncounterTableSchema);
}
