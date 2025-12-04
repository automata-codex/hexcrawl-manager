import { z } from 'zod';

export const EncounterEntrySchema = z.object({
  encounterId: z.string(),
  weight: z.number(),
});

export const TieredSubtableSchema = z.record(
  z.string(), // keys: tier numbers as strings
  z.array(EncounterEntrySchema).describe('Tier number (as a string)'),
);

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

export const WeightedCategoryTable = z.array(CategoryWeight);
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
