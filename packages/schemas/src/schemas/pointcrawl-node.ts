import { z } from 'zod';

import { EncounterOverrideSchema } from './encounter-override';
import { TreasureSchema } from './treasure';

export const PointcrawlNodeSchema = z
  .object({
    id: z.string().describe('Unique identifier within the pointcrawl'),
    pointcrawlId: z.string().describe('Reference to the parent pointcrawl'),
    label: z
      .string()
      .describe('Map label shown on the pointcrawl diagram (e.g., "1.8" or "8")'),
    name: z.string().describe('Colorful display name (e.g., "The Whispering Wood")'),
    level: z
      .number()
      .int()
      .optional()
      .describe('Level/deck number for multi-level pointcrawls'),
    encounters: z
      .array(z.string())
      .optional()
      .describe('Set encounter IDs (guaranteed to occur)'),
    encounterOverrides: EncounterOverrideSchema.optional().describe(
      'Overrides for random encounter tables',
    ),
    treasure: z.array(TreasureSchema).optional(),
    unlocks: z
      .array(z.string())
      .optional()
      .describe('IDs of knowledge nodes that are unlocked at this location'),
  })
  .describe('A node (location) in a pointcrawl');

export type PointcrawlNodeData = z.infer<typeof PointcrawlNodeSchema>;
