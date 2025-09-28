import { z } from 'zod';

export const ZoneCrawlSchema = z.object({
  id: z.string(),
  title: z.string(),
});
