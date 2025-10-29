import { z } from 'zod';

/**
 * Schema for a single character's AP totals (cached data)
 */
export const ApTotalsEntrySchema = z.object({
  characterId: z.string(),
  totals: z.object({
    combat: z.number().int().nonnegative(),
    exploration: z.number().int().nonnegative(),
    social: z.number().int().nonnegative(),
  }),
});

/**
 * Schema for the cached AP totals file
 */
export const ApTotalsCacheSchema = z.object({
  lastUpdated: z.string(), // ISO timestamp
  entries: z.array(ApTotalsEntrySchema),
});

export type ApTotalsEntry = z.infer<typeof ApTotalsEntrySchema>;
export type ApTotalsCache = z.infer<typeof ApTotalsCacheSchema>;
