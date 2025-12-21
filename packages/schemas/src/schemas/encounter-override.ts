import { z } from 'zod';

import { EncounterEntrySchema, WeightedCategoryTable } from './encounter-table.js';

export const EncounterOverrideSchema = z.object({
  mainTable: WeightedCategoryTable.optional(),
  categoryTables: z
    .record(
      z.string(), // category name
      z
        .record(
          z.string(), // tier
          z.array(EncounterEntrySchema),
        )
        .optional(),
    )
    .optional(),
});

export type EncounterOverrideData = z.infer<typeof EncounterOverrideSchema>;
