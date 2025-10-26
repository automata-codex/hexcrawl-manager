import { describe, expect, it } from 'vitest';

import { loadEncounterTable } from './load-encounter-table';

describe('loadEncounterTable', () => {
  it('loads and validates the default encounter table', () => {
    const table = loadEncounterTable();

    // Verify basic structure
    expect(table).toHaveProperty('mainTable');
    expect(table).toHaveProperty('categoryTables');
    expect(Array.isArray(table.mainTable)).toBe(true);
    expect(typeof table.categoryTables).toBe('object');
  });
});
