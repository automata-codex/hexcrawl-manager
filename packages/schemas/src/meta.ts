import { z } from 'zod';

export const MetaSchema = z.object({
  appliedSessions: z.array(z.string()),
  nextSessionSeq: z.number(),
  rolledSeasons: z.array(z.string()),
});
