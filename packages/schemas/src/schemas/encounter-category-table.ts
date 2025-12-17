import { z } from 'zod';

export const DieTypeEnum = z.enum(['d4', 'd6', 'd8', 'd10', 'd12', 'd20']);

// Entry for description tables (flavor text results like ghostly echoes)
export const DescriptionEntrySchema = z.object({
  roll: z.number().int().min(1),
  description: z.string(),
});

// Entry for encounter-reference tables (links to encounter definitions)
export const EncounterReferenceEntrySchema = z.object({
  encounterId: z.string(),
  weight: z.number().int().min(1),
});

// Description table type (existing behavior - flavor text results)
const DescriptionTableSchema = z.object({
  type: z.literal('description'),
  id: z.string(),
  name: z.string(),
  dieType: DieTypeEnum,
  entries: z.array(DescriptionEntrySchema).min(1),
});

// Tiered encounter entries (matches inline categoryTables format)
export const TieredEncounterEntriesSchema = z.record(
  z.string(), // tier numbers as strings ("1", "2", etc.)
  z.array(EncounterReferenceEntrySchema).min(1),
);

// Encounter reference table type (new - links to encounter definitions)
const EncounterReferenceTableSchema = z.object({
  type: z.literal('encounter-reference'),
  id: z.string(),
  name: z.string(),
  tiers: TieredEncounterEntriesSchema,
});

// Discriminated union for the collection
export const EncounterCategoryTableSchema = z
  .discriminatedUnion('type', [DescriptionTableSchema, EncounterReferenceTableSchema])
  .describe('A standalone random table for encounter categories');

// Type exports
export type DieType = z.infer<typeof DieTypeEnum>;
export type DescriptionEntry = z.infer<typeof DescriptionEntrySchema>;
export type EncounterReferenceEntry = z.infer<typeof EncounterReferenceEntrySchema>;
export type TieredEncounterEntries = z.infer<typeof TieredEncounterEntriesSchema>;
export type DescriptionTableData = z.infer<typeof DescriptionTableSchema>;
export type EncounterReferenceTableData = z.infer<typeof EncounterReferenceTableSchema>;
export type EncounterCategoryTableData = z.infer<typeof EncounterCategoryTableSchema>;

// Legacy alias for backward compatibility
/** @deprecated Use DescriptionEntry instead */
export type TableEntry = DescriptionEntry;
