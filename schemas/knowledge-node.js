import { z } from 'zod';

export const KnowledgeNodeSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, "ID must be lowercase with underscores only"),
  name: z.string(),
  description: z.string(),
  children: z.lazy(() => z.array(KnowledgeNodeSchema)).optional(),
});
