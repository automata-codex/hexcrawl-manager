import { z } from 'zod';

export const DungeonDataSchema = z.object({
  id: z.string(),
  hexId: z.string(),
  name: z.string(),
  builders: z.array(z.enum([
    'dragons',
    'dwarves',
    'first-civilization',
    'goblins',
    'natural',
  ])),
}).describe('Data for a dungeon on a hex map');
