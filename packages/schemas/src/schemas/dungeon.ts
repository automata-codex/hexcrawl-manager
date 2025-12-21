import { z } from 'zod';

import { ClueReferencesSchema } from './clue-reference.js';
import { BuilderEnum } from './dungeon-builder.js';
import { ImageSchema } from './dungeon-image.js';
import { TreasureSchema } from './treasure.js';

export const DungeonDataSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    hexId: z.string(),
    name: z.string(),
    builders: z.array(BuilderEnum),
    images: z.array(ImageSchema).optional(),
    source: z.string().optional(),
    summary: z.string().optional(),
    statBlocks: z
      .array(z.string())
      .optional()
      .describe(
        'DEPRECATED: Use encounters array with full encounter files instead. Still supported for backward compatibility.',
      ),
    encounters: z
      .array(z.string())
      .optional()
      .describe('Array of encounter IDs used in this dungeon'),
    treasure: z.array(TreasureSchema).optional(),
    unlocks: z
      .array(z.string())
      .optional()
      .describe('IDs of knowledge nodes that are unlocked by this site'),
    clues: ClueReferencesSchema.describe('IDs of clues that can be discovered in this dungeon'),
  })
  .refine(
    (data) => {
      if (!data.treasure) return true;

      const slugs = data.treasure
        .map((item) => item.slug)
        .filter((slug): slug is string => slug !== undefined);

      const uniqueSlugs = new Set(slugs);
      return slugs.length === uniqueSlugs.size;
    },
    {
      message: 'Treasure items must have unique slugs',
    },
  )
  .describe('Data for a dungeon on a hex map');

export type DungeonData = z.infer<typeof DungeonDataSchema>;
