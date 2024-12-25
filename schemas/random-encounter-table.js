import { z } from 'zod';

export const RandomEncounterTableSchema = z.array(
  z.object({
    id: z.string(),
    range: z.array([
      z.number().int().min(1).max(20),
      z.number().int().min(1).max(20).optional(),
    ]),
    description: z.union([
      z.object({ text: z.string() }),
      z.object({ encounter: z.string() }),
    ]),
    isHidden: z.boolean().optional(),
  })
).describe('A table of random encounters');
