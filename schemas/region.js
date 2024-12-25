import { z } from 'zod';
import { RandomEncounterTableSchema } from './random-encounter-table.js';

export const RegionDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  haven: z.string(),
  icon: z.string(),
  encounters: RandomEncounterTableSchema,
}).describe('Data for a region on a hex map');

export const RegionDatabaseSchema = z.array(
  RegionDataSchema
).describe('Database of regions on a hex map');
