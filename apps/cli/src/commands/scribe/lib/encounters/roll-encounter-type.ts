import { weightedRandomSelection } from './weighted-random-selection';

import type { EncounterTableData } from '@skyreach/schemas';

/**
 * Roll on the main encounter table to determine the category.
 * @returns The category label (e.g., "Wildlife", "Factions")
 */
export function rollEncounterType(table: EncounterTableData): string {
  const entry = weightedRandomSelection(table.mainTable, (e) => e.weight ?? 1);
  return entry.label;
}
