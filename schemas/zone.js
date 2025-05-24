import { z } from "zod";

export const ZoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  zoneCrawlId: z.string(),
  squares: z.array(z.string().regex(/^[a-lA-L](10|[1-9])$/, "Square ID must match format like A4 or J12")),
  type: z.string(),
  features: z.array(z.string()).optional(),
  narrative: z.array(z.string()).optional(),
  clues: z.array(z.string()).optional(), // optional list of knowledge keys
});
