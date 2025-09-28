import { z } from 'zod';

import { TreasureSchema } from './treasure';

export const DungeonDataSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    hexId: z.string(),
    name: z.string(),
    builders: z.array(
      z.enum([
        'alseid',
        'bearfolk',
        'cultists',
        'dragons',
        'dwarves',
        'first-civilization',
        'goblins',
        'natural',
      ]),
    ),
    images: z
      .array(
        z.object({
          filename: z.string(),
          description: z.string(),
          display: z.boolean().optional(),
        }),
      )
      .optional(),
    source: z.string().optional(),
    summary: z.string().optional(),
    statBlocks: z.array(z.string()).optional(),
    treasure: z.array(TreasureSchema).optional(),
    unlocks: z
      .array(z.string())
      .optional()
      .describe('IDs of knowledge nodes that are unlocked by this site'),
  })
  .describe('Data for a dungeon on a hex map');

export type DungeonData = z.infer<typeof DungeonDataSchema>;
