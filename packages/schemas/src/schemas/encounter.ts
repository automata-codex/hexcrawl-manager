import { z } from 'zod';

export const EncounterSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    contentPath: z.string().optional(),
    statBlocks: z.array(z.string()),
  })
  .refine(
    (data) => data.description || data.contentPath,
    {
      message: "Either 'description' or 'contentPath' must be provided",
    },
  )
  .describe('EncounterSchema');

export type EncounterData = z.infer<typeof EncounterSchema>;
