import type {
  CategoryTableData,
  CategoryTableReferenceData,
  EncounterOverrideData,
  EncounterTableData,
  TieredSubtableData,
} from '@achm/schemas';

/**
 * Type guard for a category's tableId reference vs. its inline tiers. A plain
 * 'tableId' in value check doesn't narrow cleanly here because TieredSubtableData
 * is a string index signature, so TS can't rule out a "tableId" tier key on it.
 */
export function isCategoryTableReference(
  value: TieredSubtableData | CategoryTableReferenceData,
): value is CategoryTableReferenceData {
  return typeof (value as CategoryTableReferenceData).tableId === 'string';
}

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
    for (const [category, override] of Object.entries(overrides.categoryTables)) {
      if (!override) continue;

      if ('tableId' in override) {
        // A tableId reference replaces the whole category, not individual tiers
        categoryTables[category] = override;
        continue;
      }

      const existing = categoryTables[category];
      const tiers = existing && !('tableId' in existing) ? existing : {};
      categoryTables[category] = tiers;

      for (const [tier, overrideEntries] of Object.entries(override)) {
        tiers[tier] = overrideEntries;
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
