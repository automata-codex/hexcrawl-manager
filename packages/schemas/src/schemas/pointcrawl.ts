import { z } from 'zod';

import { BuilderEnum } from './dungeon-builder';
import { ImageSchema } from './dungeon-image';
import { EncounterTableSchema } from './encounter-table';

export const PointcrawlSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    hexIds: z
      .array(z.string())
      .describe('Hex IDs where this pointcrawl is accessible'),
    builders: z.array(BuilderEnum).optional(),
    images: z.array(ImageSchema).optional(),
    encounters: EncounterTableSchema.optional().describe(
      'Default encounter table inherited by nodes and edges',
    ),
    encounterChance: z
      .number()
      .int()
      .min(0)
      .max(20)
      .optional()
      .describe(
        'Default encounter check threshold on d20 (roll this or lower triggers encounter). Nodes can override.',
      ),
    summary: z.string().optional(),
  })
  .describe('A pointcrawl map with nodes and edges');

export type PointcrawlData = z.infer<typeof PointcrawlSchema>;
