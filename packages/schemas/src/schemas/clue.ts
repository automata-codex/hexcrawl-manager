import { z } from 'zod';

import { FactionEnum } from './encounter.js';

// Re-export clue reference types from the separate module (avoids circular deps)
export {
  ClueReferenceSchema,
  ClueReferencesSchema,
  normalizeClueRef,
  type ClueReference,
  type ClueReferences,
} from './clue-reference.js';

export const ClueStatusEnum = z.enum(['unknown', 'known']);

export const ClueKnownTagEnum = z.enum([
  'dragon-empire',
  'first-civilization',
  'fort-dagaric',
  'kashra-crystals',
  'scar-sites',
  'singing-hill',
  'sphadhika',
]);

export const ClueTagSchema = z.union([ClueKnownTagEnum, z.string()]);

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
      .array(ClueTagSchema)
      .optional()
      .describe('Additional tags for filtering (themes, characters, etc.)'),

    // Placement tracking
    minPlacements: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Target number of placements for this clue'),

    // Linked clues - revealed when this clue is discovered
    linkedClues: z
      .array(z.string())
      .optional()
      .describe('Clue IDs that are revealed when this clue is learned'),

    status: ClueStatusEnum.default('unknown'),
  })
  .describe('ClueSchema');

export type ClueData = z.infer<typeof ClueSchema>;
export type ClueKnownTag = z.infer<typeof ClueKnownTagEnum>;
export type ClueStatus = z.infer<typeof ClueStatusEnum>;
