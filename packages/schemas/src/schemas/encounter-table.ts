import { z } from 'zod';

// GM-facing probabilities are displayed as weight/20 (e.g. RandomEncounterTable.astro,
// TierSubtable.astro) rather than normalized by the actual total, so every weighted list
// below must sum to exactly this value or the displayed odds are silently wrong.
const EXPECTED_WEIGHT_TOTAL = 20;

function sumWeights(entries: { weight: number }[]): number {
  return entries.reduce((total, entry) => total + entry.weight, 0);
}

export const EncounterEntrySchema = z.object({
  encounterId: z.string(),
  weight: z.number(),
});

export const TieredSubtableSchema = z
  .record(
    z.string(), // keys: tier numbers as strings
    z.array(EncounterEntrySchema).describe('Tier number (as a string)'),
  )
  .superRefine((tiers, ctx) => {
    for (const [tier, entries] of Object.entries(tiers)) {
      const total = sumWeights(entries);
      if (total !== EXPECTED_WEIGHT_TOTAL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tier "${tier}" weights sum to ${total}, expected ${EXPECTED_WEIGHT_TOTAL}.`,
          path: [tier],
        });
      }
    }
  });

export const CategoryWeight = z.object({
  category: z.string(),
  label: z.string(),
  weight: z.number(),
  tableId: z
    .string()
    .optional()
    .describe(
      'Reference to an external encounter-category-table. If set, uses that table instead of categoryTables.',
    ),
});

export const WeightedCategoryTable = z.array(CategoryWeight).superRefine((entries, ctx) => {
  const total = sumWeights(entries);
  if (total !== EXPECTED_WEIGHT_TOTAL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `mainTable weights sum to ${total}, expected ${EXPECTED_WEIGHT_TOTAL}.`,
    });
  }
});

export const CategoryTable = z.record(
  z.string(), // keys: category names
  TieredSubtableSchema.describe('Category name'),
);

export const EncounterTableSchema = z
  .object({
    mainTable: WeightedCategoryTable,
    categoryTables: CategoryTable,
  })
  .describe('EncounterTableSchema');

export type CategoryTableData = z.infer<typeof CategoryTable>;
export type CategoryWeightData = z.infer<typeof CategoryWeight>;
export type EncounterEntryData = z.infer<typeof EncounterEntrySchema>;
export type EncounterTableData = z.infer<typeof EncounterTableSchema>;
export type TieredSubtableData = z.infer<typeof TieredSubtableSchema>;
