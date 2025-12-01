import { z } from 'zod';

import { EncounterTableSchema } from './encounter-table';

export const RegionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    haven: z.string(),
    encounterChance: z.number().int().min(1).max(20),
    encounters: EncounterTableSchema.optional(),
    encounterIds: z
      .array(z.string())
      .optional()
      .describe(
        'Explicit list of encounters for this region, derived from encounter tables or specified directly',
      ),
    type: z.enum([
      'skyreach',
      'starting',
      'mid-frontier',
      'deep-frontier',
      'mythic-realm',
    ]),
    contentDensity: z.number().int().min(1).max(5),
    treasureRating: z.number().int().min(1).max(5),
    story: z.string().optional().describe('Story or lore associated with this region'),
  })
  .describe('Data for a region on a hex map');

export type RegionData = z.infer<typeof RegionSchema>;
