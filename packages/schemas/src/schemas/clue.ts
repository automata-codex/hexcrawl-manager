import { z } from 'zod';

import { FactionEnum } from './encounter';

// Re-export clue reference types from the separate module (avoids circular deps)
export {
  ClueReferenceSchema,
  ClueReferencesSchema,
  normalizeClueRef,
  type ClueReference,
  type ClueReferences,
} from './clue-reference';

export const ClueStatusEnum = z.enum(['unknown', 'known']);

export const ClueSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    summary: z.string().describe('Brief description of the fact'),
    details: z
      .string()
      .optional()
      .describe('Extended GM-facing information about this clue'),

    // Structured taxonomy
    factions: z
      .array(FactionEnum)
      .optional()
      .describe('Factions this clue relates to'),
    plotlines: z
      .array(z.string())
      .optional()
      .describe('Plotline IDs this clue belongs to (e.g., "milly-and-baz")'),

    // Flexible categorization
    tags: z
      .array(z.string())
      .optional()
      .describe('Additional tags for filtering (themes, characters, etc.)'),

    status: ClueStatusEnum.default('unknown'),
  })
  .describe('ClueSchema');

export type ClueData = z.infer<typeof ClueSchema>;
export type ClueStatus = z.infer<typeof ClueStatusEnum>;
