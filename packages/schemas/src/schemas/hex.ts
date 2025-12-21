import { z } from 'zod';

import { ClueReferencesSchema } from './clue-reference.js';
import { EncounterOverrideSchema } from './encounter-override.js';
import { LinkTypeEnum } from './roleplay-book.js';
import { TreasureSchema } from './treasure.js';

const BiomeEnum = z.enum([
  'alpine-tundra',
  'boreal-forest',
  'coastal-ocean',
  'coastal-prairie',
  'coastal-swamp',
  'freshwater-lake',
  'glacier',
  'highland-bog',
  'marsh',
  'mixed-woodland',
  'montane-forest',
  'montane-grassland',
  'moors',
  'prairie',
  'rocky-highland',
  'subalpine-woodland',
  'swamp',
  'temperate-forest',
  'temperate-rainforest',
  'temperate-woodland',
  'Unknown',
]);

export const TerrainEnum = z.enum([
  'glacier',
  'highland-bog',
  'hills',
  'marsh',
  'moors',
  'mountains',
  'peak',
  'plains',
  'rocky-highland',
  'swamp',
  'water',
]);

export const HexId = z
  .string()
  .toLowerCase()
  .regex(/^[a-z]+[0-9]+$/, {
    message: "Hex id must be like 'q12' (letters+digits, lowercase ok)",
  });

// Base schema for all hidden sites (common fields)
const BaseHiddenSiteSchema = z.object({
  description: z.string(),
  treasure: z.array(TreasureSchema).optional(),
  unlocks: z
    .array(z.string())
    .optional()
    .describe('IDs of knowledge nodes that are unlocked by this site'),
  clues: ClueReferencesSchema.describe('IDs of clues that can be discovered at this site'),
});

/**
 * Hidden site added from a faction intelligence report.
 * Created when a GM uses an intelligence report to place a new site during play.
 */
export const FactionLeadHiddenSiteSchema = BaseHiddenSiteSchema.extend({
  source: z.literal('faction-lead'),
  sessionAdded: z
    .string()
    .describe('Session identifier when this site was added, e.g. "session-20"'),
  faction: z.string().describe('Which faction provided the intelligence report'),
  leadName: z
    .string()
    .describe('Name/title of the intelligence report that created this site'),
  linkType: LinkTypeEnum.optional().describe('Type of the linked content'),
  linkId: z.string().optional().describe('ID of the linked content (encounter, dungeon, etc.)'),
})
  .refine(
    (data) => (data.linkType && data.linkId) || (!data.linkType && !data.linkId),
    { message: 'linkType and linkId must both be present or both be absent' },
  )
  .describe('FactionLeadHiddenSiteSchema');
export type FactionLeadHiddenSite = z.infer<typeof FactionLeadHiddenSiteSchema>;

/**
 * Hidden site added from a clue discovery.
 * Created when players discover a clue that reveals a new site location.
 */
export const ClueHiddenSiteSchema = BaseHiddenSiteSchema.extend({
  source: z.literal('clue'),
  sessionAdded: z.string().describe('Session identifier when this site was added'),
  clueId: z.string().describe('ID of the floating or fixed clue that revealed this site'),
  discoveredBy: z.string().optional().describe('Which character(s) discovered the clue'),
  linkType: LinkTypeEnum.optional().describe('Type of the linked content'),
  linkId: z.string().optional().describe('ID of the linked content'),
})
  .refine(
    (data) => (data.linkType && data.linkId) || (!data.linkType && !data.linkId),
    { message: 'linkType and linkId must both be present or both be absent' },
  )
  .describe('ClueHiddenSiteSchema');
export type ClueHiddenSite = z.infer<typeof ClueHiddenSiteSchema>;

/**
 * Pre-placed hidden site (original format, no source field).
 * Used for general purpose sites, such as those that were designed into the campaign from the start.
 */
export const PreplacedHiddenSiteSchema = BaseHiddenSiteSchema.extend({
  linkType: LinkTypeEnum.optional().describe('Type of the linked content'),
  linkId: z.string().optional().describe('ID of the linked content (encounter, dungeon, etc.)'),
})
  .refine(
    (data) => (data.linkType && data.linkId) || (!data.linkType && !data.linkId),
    { message: 'linkType and linkId must both be present or both be absent' },
  )
  .describe('PreplacedHiddenSiteSchema');
export type PreplacedHiddenSite = z.infer<typeof PreplacedHiddenSiteSchema>;

/**
 * Union of all hidden site types.
 * Discriminated on 'source' field for sourced sites, with fallback to preplaced.
 */
export const HiddenSiteSchema = z.union([
  FactionLeadHiddenSiteSchema,
  ClueHiddenSiteSchema,
  PreplacedHiddenSiteSchema,
]);
export type HiddenSite = z.infer<typeof HiddenSiteSchema>;

/**
 * The array format used in hex data files.
 * Supports both legacy string array format and new object array format.
 */
export const HiddenSitesSchema = z.union([
  z.array(z.string()), // Legacy format: just description strings
  z.array(HiddenSiteSchema), // New format: full site objects
]);

export const KnownTagEnum = z.enum([
  'crystal-bounty',
  'dungeon',
  'settlement', // A settlement with the infrastructure to potentially become a haven
  'dragon-ruins',
  'fc-city',
  'fc-ruins',
  'goblin-ruins',
  'haven', // An established haven that is available to the party
  'landmark-known',
  'scar-site',
]);

export const LandmarkSchema = z.object({
  description: z.string(),
  treasure: z.array(TreasureSchema).optional(),
  unlocks: z
    .array(z.string())
    .optional()
    .describe('IDs of knowledge nodes that are unlocked by this site'),
  clues: ClueReferencesSchema.describe('IDs of clues that can be discovered at this landmark'),
});

export const TagSchema = z.union([KnownTagEnum, z.string()]);

export const KeyedEncounterTriggerEnum = z.enum(['entry', 'exploration']);

export const KeyedEncounterSchema = z.object({
  encounterId: z.string(),
  trigger: KeyedEncounterTriggerEnum,
  notes: z.string().optional().describe('GM notes about when/how this triggers'),
});

export type KeyedEncounter = z.infer<typeof KeyedEncounterSchema>;
export type KeyedEncounterTrigger = z.infer<typeof KeyedEncounterTriggerEnum>;

export const GmNoteSchema = z.union([
  z.string(),
  z.object({
    description: z.string(),
    clueId: z.string().optional().describe('If this note reveals a clue (e.g., a dream)'),
  }),
]);

export type GmNote = z.infer<typeof GmNoteSchema>;

export const HexSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    landmark: z.union([z.string(), LandmarkSchema]),
    hiddenSites: HiddenSitesSchema.optional(),
    secretSite: z.string().optional(),
    regionId: z.string(),
    hideInCatalog: z.boolean().optional(),
    isVisited: z.boolean().optional(),
    isExplored: z.boolean().optional(),
    isScouted: z.boolean().optional(),
    encounters: z
      .array(z.string())
      .optional()
      .describe('Array of encounter IDs that can occur in this hex'),
    encounterChance: z.number().int().min(1).max(20).optional(),
    encounterOverrides: EncounterOverrideSchema.optional(),
    hideRandomEncounters: z
      .boolean()
      .optional()
      .describe('When true, hides the random encounter table in the hex detail display'),
    keyedEncounters: z
      .array(KeyedEncounterSchema)
      .optional()
      .describe('Encounters that trigger under specific conditions in this hex'),
    notes: z
      .array(GmNoteSchema)
      .optional()
      .describe('Private GM eyes-only notes; can include dream-clues with linked clue IDs'),
    updates: z
      .array(z.string())
      .optional()
      .describe('Private GM-only changes to the hex since the last visit'),
    tags: z
      .array(TagSchema)
      .optional()
      .describe('Tags for filtering hexes, matching clues, etc.'),
    terrain: TerrainEnum,
    biome: BiomeEnum,
    topography: z
      .string()
      .optional()
      .describe('Free-text description of elevation and terrain features'),
  })
  .describe('HexSchema');

export type HexData = z.infer<typeof HexSchema>;
export type HiddenSitesData = z.infer<typeof HiddenSitesSchema>;
export type KnownTag = keyof z.infer<typeof KnownTagEnum>;
