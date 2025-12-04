import { z } from 'zod';

export const DieTypeEnum = z.enum(['d4', 'd6', 'd8', 'd10', 'd12', 'd20']);

export const TableEntrySchema = z.object({
  roll: z.number().int().min(1),
  description: z.string(),
});

export const EncounterCategoryTableSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    dieType: DieTypeEnum,
    entries: z.array(TableEntrySchema).min(1),
  })
  .describe('A standalone random table for encounter categories');

export type DieType = z.infer<typeof DieTypeEnum>;
export type TableEntry = z.infer<typeof TableEntrySchema>;
export type EncounterCategoryTableData = z.infer<
  typeof EncounterCategoryTableSchema
>;
