import { z } from 'zod';

export type KnowledgeNodeData = {
  id: string;
  children?: KnowledgeNodeData[];
  description: string;
  isKnown?: boolean;
  isUnlocked?: boolean;
  name: string;
  details?: string;
};

export const KnowledgeNodeSchema: z.ZodType<KnowledgeNodeData> = z.lazy(() =>
  z.object({
    id: z
      .string()
      .regex(/^[a-z0-9_]+$/, 'ID must be lowercase with underscores only'),
    children: z.array(KnowledgeNodeSchema).optional(),
    description: z.string(),
    isKnown: z.boolean().optional(),
    isUnlocked: z
      .boolean()
      .optional()
      .describe('Whether this knowledge node has been unlocked by the party'),
    name: z.string(),
    details: z
      .string()
      .optional()
      .describe('Further details about the clue; extended information'),
  }),
);
