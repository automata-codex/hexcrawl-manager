import { z } from 'zod';

export const UnusedHiddenSiteSchema = z.object({
  description: z.string(),
  gmNotes: z.array(z.string()).optional(),
});

export const UnusedHiddenSiteListSchema = z.array(UnusedHiddenSiteSchema);
