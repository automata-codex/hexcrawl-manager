import { rollDice } from '@skyreach/data';

import type {
  CategoryTableData,
  EncounterTableData,
} from '@skyreach/schemas';

/**
 * Roll a d20 to determine if an encounter occurs.
 * For MVP, uses a hardcoded threshold of 1 (5% chance).
 * @returns true if an encounter occurs
 */
export function rollEncounterOccurs(): boolean {
  const roll = rollDice('1d20');
  return roll === 1;
}

/**
 * Perform weighted random selection from a list of entries.
 * Assumes weights sum to a die size (typically 20 for d20).
 */
function weightedRandomSelection<T>(
  entries: T[],
  getWeight: (entry: T) => number,
): T {
  const totalWeight = entries.reduce((sum, e) => sum + getWeight(e), 0);
  const roll = rollDice(`1d${totalWeight}`);

  let cumulative = 0;
  for (const entry of entries) {
    cumulative += getWeight(entry);
    if (roll <= cumulative) {
      return entry;
    }
  }

  // Fallback (should never reach here if weights are correct)
  return entries[entries.length - 1];
}

/**
 * Roll on the main encounter table to determine the category.
 * @returns The category label (e.g., "Wildlife", "Factions")
 */
export function rollEncounterType(table: EncounterTableData): string {
  const entry = weightedRandomSelection(
    table.mainTable,
    (e) => e.weight ?? 1,
  );
  return entry.label;
}

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
  const categoryData: CategoryTableData | undefined =
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

/**
 * Roll for an encounter entering a hex.
 * Returns an empty string if no encounter occurs.
 * Returns a formatted note string if an encounter occurs.
 *
 * @param hexId The hex being entered
 * @param table The encounter table to use
 */
export function makeEncounterNote(
  hexId: string,
  table: EncounterTableData,
): string {
  if (!rollEncounterOccurs()) {
    return '';
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
