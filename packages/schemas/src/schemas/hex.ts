import { z } from 'zod';

import { EncounterOverrideSchema } from './encounter-override';
import { LinkTypeEnum } from './roleplay-book';
import { TreasureSchema } from './treasure';

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
 * Used for sites that were designed into the campaign from the start.
 */
export const PreplacedHiddenSiteSchema = BaseHiddenSiteSchema.describe(
  'PreplacedHiddenSiteSchema',
);
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
  'settlement',
  'dragon-ruins',
  'fc-city',
  'fc-ruins',
  'goblin-ruins',
  'haven',
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
});

export const TagSchema = z.union([KnownTagEnum, z.string()]);

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
    notes: z
      .array(z.string())
      .optional()
      .describe('Private GM eyes-only notes'),
    updates: z
      .array(z.string())
      .optional()
      .describe('Private GM-only changes to the hex since the last visit'),
    tags: z
      .array(TagSchema)
      .optional()
      .describe('Tags for filtering hexes, matching clues, etc.'),
    terrain: z.string(),
    vegetation: z
      .string()
      .optional()
      .describe('Deprecated: use `biome` instead'),
    biome: BiomeEnum,
    elevation: z.number().int().describe('Weighted average elevation in feet'),
  })
  .describe('HexSchema');

export type HexData = z.infer<typeof HexSchema>;
export type HiddenSitesData = z.infer<typeof HiddenSitesSchema>;
export type KnownTag = keyof z.infer<typeof KnownTagEnum>;
