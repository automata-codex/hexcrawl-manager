import { z } from 'zod';

import { TieredSubtableSchema, WeightedCategoryTable } from './encounter-table.js';

export const EncounterOverrideSchema = z.object({
  mainTable: WeightedCategoryTable.optional(),
  categoryTables: z
    .record(
      z.string(), // category name
      TieredSubtableSchema.optional(),
    )
    .optional(),
});

export type EncounterOverrideData = z.infer<typeof EncounterOverrideSchema>;
