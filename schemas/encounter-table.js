import { z } from "zod";

export const EncounterEntrySchema = z.object({
  encounterId: z.string(),
  weight: z.number().default(1),
});

export const TieredSubtableSchema = z.record(
  z.string(), // keys: tier numbers as strings
  z.array(EncounterEntrySchema).describe('Tier number (as a string)'),
);

export const CategoryWeight = z.object({
  category: z.string(),
  label: z.string(),
  weight: z.number().default(1),
});

export const WeightedCategoryTable = z.array(CategoryWeight);
export const CategoryTable = z.record(
  z.string(), // keys: category names
  TieredSubtableSchema.describe('Category name'),
);

export const EncounterTableSchema = z.object({
  mainTable: WeightedCategoryTable,
  categoryTables: CategoryTable,
}).describe("EncounterTableSchema");
