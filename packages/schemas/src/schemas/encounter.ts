import { z } from 'zod';

import { CreatureTypeEnum } from './stat-block';

export const EncounterScopeEnum = z.enum(['general', 'hex', 'region', 'dungeon']);

export const LocationTypeEnum = z.enum(['wilderness', 'dungeon']);

export const FactionEnum = z.enum([
  'alseid',
  'bearfolk',
  'beldrunn-vok',
  'blackthorns',
  'flamehold-dwarves',
  'kobolds',
  'revenant-legion',
  'servitors',
  'three-dukes',
  'veil-shepherds',
]);

export const UsageReferenceSchema = z.object({
  type: z.enum(['hex', 'region', 'dungeon']),
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
export type Faction = z.infer<typeof FactionEnum>;
export type UsageReference = z.infer<typeof UsageReferenceSchema>;
// Note: CreatureType is exported from stat-block.ts
