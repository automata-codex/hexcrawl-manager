import { z } from 'zod';

export const TreasureSchema = z.object({
  name: z.string(),
  value: z.number().optional(), // only for non-magic treasure
  type: z.enum(['art', 'currency', 'magic-item', 'relic', 'salvage']),
  rarity: z
    .enum(['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'])
    .optional(), // only for magic items
  notes: z.string().optional(),
});
