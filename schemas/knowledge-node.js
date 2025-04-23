import { z } from 'zod';

export const KnowledgeNodeSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, "ID must be lowercase with underscores only"),
  children: z.lazy(() => z.array(KnowledgeNodeSchema)).optional(),
  description: z.string(),
  isKnown: z.boolean().optional().default(false),
  name: z.string(),
});
