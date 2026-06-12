import { rollEncounterEntry } from './roll-encounter-entry';
import { rollEncounterType } from './roll-encounter-type';

import type { EncounterTableData } from '@achm/schemas';

/**
 * Build a note for an encounter entering a hex, rolling the category and
 * specific entry from the table. Occurrence is decided by the caller (see
 * `rollEncounterOccurs`); this is only called once an encounter has occurred.
 *
 * @param hexId The hex being entered
 * @param table The encounter table to use
 */
export function makeEncounterNote(
  hexId: string,
  table: EncounterTableData,
): string {
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
