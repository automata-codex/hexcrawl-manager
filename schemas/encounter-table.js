import { z } from "zod";

export const EncounterEntrySchema = z.object({
  encounterId: z.string(),
  weight: z.number().default(1),
});

export const TieredSubtableSchema = z.record(z.string(), z.array(EncounterEntrySchema)); // keys: tier numbers as strings

export const CategoryWeight = z.object({
  category: z.string(),
  label: z.string(),
  weight: z.number().default(1),
});

export const WeightedCategoryTable = z.array(CategoryWeight);
export const CategoryTable = z.record(z.string(), TieredSubtableSchema); // keys: category names

export const EncounterTableSchema = z.object({
  mainTable: WeightedCategoryTable,
  categoryTables: CategoryTable,
});
