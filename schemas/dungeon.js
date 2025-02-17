import { z } from 'zod';

export const DungeonDataSchema = z.object({
  id: z.string(),
  slug: z.string(),
  hexId: z.string(),
  name: z.string(),
  builders: z.array(z.enum([
    'cultists',
    'dragons',
    'dwarves',
    'first-civilization',
    'goblins',
    'natural',
  ])),
  image: z.string().optional(),
  source: z.string().optional(),
}).describe('Data for a dungeon on a hex map');
