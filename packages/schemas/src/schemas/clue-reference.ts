import { z } from 'zod';

/**
 * A reference to a clue that can be discovered at a location.
 * Can be either a simple string (just the clue ID) or an object with
 * the ID and optional context describing how/when the clue is discovered.
 */
export const ClueReferenceSchema = z.union([
  z.string(),
  z.object({
    id: z.string(),
    context: z.string().optional(),
  }),
]);

export type ClueReference = z.infer<typeof ClueReferenceSchema>;

/**
 * An array of clue references. Used for the `clues` field on various schemas.
 */
export const ClueReferencesSchema = z.array(ClueReferenceSchema).optional();

export type ClueReferences = z.infer<typeof ClueReferencesSchema>;

/**
 * Normalizes a clue reference to a consistent object shape.
 */
export function normalizeClueRef(ref: ClueReference): { id: string; context?: string } {
  return typeof ref === 'string' ? { id: ref } : ref;
}
