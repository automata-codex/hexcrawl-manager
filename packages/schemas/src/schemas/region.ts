import { z } from 'zod';

import { EncounterTableSchema } from './encounter-table.js';

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
    story: z
      .string()
      .optional()
      .describe('Story or lore associated with this region'),
    topography: z
      .string()
      .optional()
      .describe('Free-text description of regional elevation trends and notable terrain features'),
    heraldEncounters: z
      .array(z.string())
      .optional()
      .describe('Array of encounter IDs for herald encounters shown when first entering this region'),
    heraldComplete: z
      .boolean()
      .optional()
      .describe('When true, herald phase is complete and normal encounters are shown'),
  })
  .describe('Data for a region on a hex map');

export type RegionData = z.infer<typeof RegionSchema>;
