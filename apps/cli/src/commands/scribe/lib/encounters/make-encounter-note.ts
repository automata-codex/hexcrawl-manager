import { rollEncounterEntry } from './roll-encounter-entry';
import { rollEncounterOccurs } from './roll-encounter-occurs';
import { rollEncounterType } from './roll-encounter-type';

import type { EncounterTableData } from '@skyreach/schemas';

/**
 * Roll for an encounter entering a hex.
 * Returns null if no encounter occurs.
 * Returns a formatted note string if an encounter occurs.
 *
 * @param hexId The hex being entered
 * @param table The encounter table to use
 */
export function makeEncounterNote(
  hexId: string,
  table: EncounterTableData,
): string | null {
  if (!rollEncounterOccurs()) {
    return null;
  }

  // Roll for category
  const categoryLabel = rollEncounterType(table);
  const categoryEntry = table.mainTable.find((e) => e.label === categoryLabel);

  if (!categoryEntry) {
    return `Encounter entering ${hexId}: Unknown category`;
  }

  // Roll for specific encounter
  const encounterId = rollEncounterEntry(categoryEntry.category, table);

  return `Encounter entering ${hexId}: ${categoryLabel} - ${encounterId}`;
}
