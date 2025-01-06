import { z } from 'zod';

export const FloatingClueSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  reference: z.object({
    text: z.string(),
    url: z.string().url(),
  }).optional(),
  detailText: z.string().optional(),
});
