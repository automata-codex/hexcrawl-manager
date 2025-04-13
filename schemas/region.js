import { z } from 'zod';
import { RandomEncounterTableSchema } from './random-encounter-table.js';
import { EncounterTableSchema } from './encounter-table.js';

export const RegionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  haven: z.string(),
  icon: z.string().optional(),
  encounterChance: z.number().int().min(1).max(20),
  encounters: EncounterTableSchema.optional(),
}).describe('Data for a region on a hex map');
