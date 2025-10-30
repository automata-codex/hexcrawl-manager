import { weightedRandomSelection } from './weighted-random-selection';

import type { EncounterTableData, TieredSubtableData } from '@skyreach/schemas';

/**
 * Roll on a category's subtable to get a specific encounter.
 * For MVP, always uses tier "1" subtable.
 * @param category The category ID (e.g., "wildlife", "factions")
 * @returns The encounter ID (e.g., "black-bear")
 */
export function rollEncounterEntry(
  category: string,
  table: EncounterTableData,
): string {
  const categoryData: TieredSubtableData | undefined =
    table.categoryTables[category];

  if (!categoryData) {
    return `Unknown category: ${category}`;
  }

  // For MVP, always use tier 1
  const tier = '1';
  const subtable = categoryData[tier];

  if (!subtable || subtable.length === 0) {
    return `No encounters for category ${category}, tier ${tier}`;
  }

  const entry = weightedRandomSelection(subtable, (e) => e.weight ?? 1);
  return entry.encounterId;
}
