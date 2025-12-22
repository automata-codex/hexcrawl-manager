import { z } from 'zod';

import { ClueReferencesSchema } from './clue-reference.js';
import { CreatureTypeEnum } from './stat-block.js';

export const EncounterScopeEnum = z.enum(['general', 'herald', 'hex', 'region', 'dungeon', 'pointcrawl']);

export const LocationTypeEnum = z.enum(['wilderness', 'dungeon']);

/**
 * Faction ID - accepts any string.
 * Validation of faction IDs against actual faction files is done at build time
 * via the validate-faction-ids.ts script.
 */
export const FactionId = z.string();

/**
 * @deprecated Use FactionId instead. Kept for backward compatibility.
 */
export const FactionEnum = FactionId;

export const UsageReferenceSchema = z.object({
  type: z.enum(['hex', 'region', 'dungeon', 'pointcrawl', 'pointcrawl-node', 'pointcrawl-edge']),
  id: z.string(),
  name: z.string(),
});

export const EncounterSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    contentPath: z.string().optional(),
    statBlocks: z.array(z.string()),

    // Taxonomy fields
    scope: EncounterScopeEnum.optional(),

    locationTypes: z
      .array(LocationTypeEnum)
      .min(1)
      .optional()
      .describe('Required for general-scope encounters, optional for others'),

    factions: z.array(FactionEnum).optional(),

    unlocks: z
      .array(z.string())
      .optional()
      .describe('IDs of knowledge nodes that are unlocked by this encounter'),

    clues: ClueReferencesSchema.describe('IDs of clues that this encounter can reveal'),

    // Derived fields (populated at build time)
    isLead: z
      .boolean()
      .optional()
      .describe(
        'Automatically set to true if encounter is referenced in any roleplay book intelligence report. Leads are considered "used" even if not referenced elsewhere.',
      ),

    creatureTypes: z
      .array(CreatureTypeEnum)
      .optional()
      .describe('Automatically derived from stat blocks'),

    usedIn: z
      .array(UsageReferenceSchema)
      .optional()
      .describe('Automatically populated by analyzing references'),
  })
  .refine((data) => data.description || data.contentPath, {
    message: "Either 'description' or 'contentPath' must be provided",
  })
  .refine(
    (data) => {
      // locationTypes required for general scope
      if (
        data.scope === 'general' &&
        (!data.locationTypes || data.locationTypes.length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'locationTypes is required for general-scope encounters',
      path: ['locationTypes'],
    },
  )
  .describe('EncounterSchema');

export type EncounterData = z.infer<typeof EncounterSchema>;
export type EncounterScope = z.infer<typeof EncounterScopeEnum>;
export type LocationType = z.infer<typeof LocationTypeEnum>;
export type FactionIdType = z.infer<typeof FactionId>;
/** @deprecated Use FactionIdType instead */
export type Faction = FactionIdType;
export type UsageReference = z.infer<typeof UsageReferenceSchema>;
// Note: CreatureType is exported from stat-block.ts
