import type {
  CategoryTableData,
  EncounterOverrideData,
  EncounterTableData,
} from '@skyreach/schemas';

/**
 * Merges encounter table overrides with a base table.
 * Used by both hex and pointcrawl node pages.
 */
export function mergeEncounterOverrides(
  base: EncounterTableData,
  overrides?: EncounterOverrideData,
): EncounterTableData {
  if (!overrides) return base;

  // Use the override mainTable if provided, otherwise keep base
  const mainTable = overrides.mainTable ?? base.mainTable;

  const categoryTables: CategoryTableData = structuredClone(base.categoryTables);

  if (overrides.categoryTables) {
    for (const [category, tierOverrides] of Object.entries(
      overrides.categoryTables,
    )) {
      categoryTables[category] = categoryTables[category] || {};

      for (const [tier, overrideEntries] of Object.entries(
        tierOverrides ?? {},
      )) {
        categoryTables[category][tier] = overrideEntries;
      }
    }
  }

  return { mainTable, categoryTables };
}

export function buildWeightedRanges<T>(
  entries: T[],
  getWeight: (entry: T) => number = () => 1,
  startAt = 1,
): Array<{ range: string; entry: T }> {
  const result: Array<{ range: string; entry: T }> = [];
  let current = startAt;

  for (const entry of entries) {
    const weight = getWeight(entry);
    const start = current;
    const end = current + weight - 1;
    current = end + 1;

    result.push({
      range: start === end ? `${start}` : `${start}–${end}`,
      entry,
    });
  }

  return result;
}

export function validateWeightTotal<T>(
  entries: T[],
  getWeight: (entry: T) => number = () => 1,
  expectedTotal = 20,
): string | null {
  const total = entries.reduce((sum, entry) => sum + getWeight(entry), 0);
  if (total !== expectedTotal) {
    return `⚠️ Total weight is ${total}, expected ${expectedTotal} for a d${expectedTotal} table.`;
  }
  return null;
}
