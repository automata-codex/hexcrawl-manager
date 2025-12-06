import { z } from 'zod';

export type KnowledgeNodeData = {
  id: string;
  children?: KnowledgeNodeData[];
  description: string;
  details?: string;
  isKnown?: boolean;
  isUnlocked?: boolean;
  name: string;
  notPlaced?: boolean;
};

export const KnowledgeNodeSchema: z.ZodType<KnowledgeNodeData> = z.lazy(() =>
  z.object({
    id: z
      .string()
      .regex(/^[a-z0-9_-]+$/, 'ID must be lowercase in snake- or kebab-case'),
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
    notPlaced: z
      .boolean()
      .optional()
      .describe(
        'When true, placement list is not rendered. Used for nodes that represent a task/objective without a specific location; available for other uses.',
      ),
  }),
);
