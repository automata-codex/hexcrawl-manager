import { z } from 'zod';

export const ZoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  zoneCrawlId: z.string(),
  squares: z.array(
    z
      .string()
      .regex(
        /^[a-lA-L](10|[1-9])$/,
        'Square ID must match format like A4 or J12',
      ),
  ),
  primaryType: z.string(),
  secondaryTypes: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional().describe('DM notes for the zone'),
  narrative: z
    .array(z.string())
    .optional()
    .describe('Player-facing descriptions and information'),
  clues: z
    .array(z.string())
    .optional()
    .describe('List of knowledge keys or "unlocks"'),
});
