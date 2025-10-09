import { z } from 'zod';

export const TrailSchema = z.object({
  from: z.string().regex(/^[a-z]\d+$/), // e.g., "T15"
  to: z.string().regex(/^[a-z]\d+$/), // e.g., "T16"
  uses: z.number().int().min(0),
  isMarked: z.boolean(), // true only before trail becomes visible
  lastUsed: z.string(), // campaign date string
  notes: z.string().optional(), // freeform GM notes
});
