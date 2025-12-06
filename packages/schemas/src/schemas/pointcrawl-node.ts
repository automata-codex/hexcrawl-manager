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
    isEntry: z
      .boolean()
      .optional()
      .describe('Whether this node is an entry point accessible from outside the pointcrawl'),
    entryConditions: z
      .string()
      .optional()
      .describe('Conditions when this node functions as an entry point and when it does not'),
    encounters: z
      .array(z.string())
      .optional()
      .describe('Set encounter IDs (guaranteed to occur)'),
    encounterOverrides: EncounterOverrideSchema.optional().describe(
      'Overrides for random encounter tables',
    ),
    encounterChance: z
      .number()
      .int()
      .min(0)
      .max(20)
      .optional()
      .describe(
        'Encounter check threshold on d20 (roll this or lower triggers encounter). Default inherited from pointcrawl.',
      ),
    hideRandomEncounters: z
      .boolean()
      .optional()
      .describe('If true, suppress random encounter table display for this node'),
    treasure: z.array(TreasureSchema).optional(),
    unlocks: z
      .array(z.string())
      .optional()
      .describe('IDs of knowledge nodes that are unlocked at this location'),
    naturalLight: z
      .enum(['bright', 'dim', 'none'])
      .optional()
      .describe('Light from sky exposure; degrades with time of day'),
    internalLight: z
      .enum(['dim', 'none'])
      .optional()
      .describe(
        'Light from kashra crystals, bioluminescence, or other persistent sources',
      ),
  })
  .describe('A node (location) in a pointcrawl');

export type PointcrawlNodeData = z.infer<typeof PointcrawlNodeSchema>;
