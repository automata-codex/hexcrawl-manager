import { z } from 'zod';
import { EncounterTableSchema } from './encounter-table.js';

export const RegionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  haven: z.string(),
  encounterChance: z.number().int().min(1).max(20),
  encounters: EncounterTableSchema.optional(),
  type: z.enum(['skyreach', 'starting', 'mid-frontier', 'deep-frontier', 'mythic-realm']),
  contentDensity: z.number().int().min(1).max(5),
  treasureRating: z.number().int().min(1).max(5),
}).describe('Data for a region on a hex map');
