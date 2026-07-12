import { z } from 'zod';

import { CategoryTableReference, TieredSubtableSchema, WeightedCategoryTable } from './encounter-table.js';

export const EncounterOverrideSchema = z.object({
  mainTable: WeightedCategoryTable.optional(),
  categoryTables: z
    .record(
      z.string(), // category name
      z.union([TieredSubtableSchema, CategoryTableReference]).optional(),
    )
    .optional(),
});

export type EncounterOverrideData = z.infer<typeof EncounterOverrideSchema>;
