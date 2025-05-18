import { z } from 'zod';
import { EncounterOverrideSchema } from './encounter-override.js';
import { TreasureSchema } from './treasure.js';

const BiomeEnum = z.enum([
  "alpine-tundra",
  "boreal-forest",
  "coastal-ocean",
  "coastal-prairie",
  "coastal-swamp",
  "freshwater-lake",
  "glacier",
  "highland-bog",
  "marsh",
  "mixed-woodland",
  "montane-forest",
  "montane-grassland",
  "moors",
  "prairie",
  "rocky-highland",
  "subalpine-woodland",
  "swamp",
  "temperate-forest",
  "temperate-rainforest",
  "temperate-woodland",
  "Unknown",
]);

export const HiddenSitesSchema = z.object({
  description: z.string(),
  treasure: z.array(TreasureSchema).optional(),
  unlocks: z.array(z.string())
    .optional()
    .describe('IDs of knowledge nodes that are unlocked by this site'),
});

export const KnownTagEnum = z.enum([
  'crystal-bounty',
  'dungeon',
  'settlement',
  'dragon-ruins',
  'fc-ruins',
  'goblin-ruins',
  'haven',
  'scar-site',
]);


export const LandmarkSchema = z.object({
  description: z.string(),
  treasure: z.array(TreasureSchema).optional(),
  unlocks: z.array(z.string())
    .optional()
    .describe('IDs of knowledge nodes that are unlocked by this site'),
});

export const TagSchema = z.union([KnownTagEnum, z.string()]);

export const HexSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  landmark: z.union([
    z.string(),
    LandmarkSchema,
  ]),
  hiddenSites: z.union([
    z.array(z.string()),
    z.array(HiddenSitesSchema),
  ]).optional(),
  secretSite: z.string().optional(),
  regionId: z.string(),
  hideInCatalog: z.boolean().optional(),
  isVisited: z.boolean().optional(),
  isExplored: z.boolean().optional(),
  encounterChance: z.number().int().min(1).max(20).optional(),
  encounterOverrides: EncounterOverrideSchema.optional(),
  flags: z.object({
    hasCrystals: z.boolean().optional(),
    hasDungeon: z.boolean().optional(),
    hasSettlement: z.boolean().optional(),
    isDragonRuins: z.boolean().optional(),
    isFcRuins: z.boolean().optional(),
    isGoblinRuins: z.boolean().optional(),
    isHaven: z.boolean().optional(),
    isScarSite: z.boolean().optional(),
  }).optional().describe('Flags for different hex categories and types'),
  notes: z.array(z.string())
    .optional()
    .describe('Private GM eyes-only notes'),
  updates: z.array(z.string())
    .optional()
    .describe('Private GM-only changes to the hex since the last visit'),
  tags: z.array(TagSchema)
    .optional()
    .describe('Tags for filtering hexes, matching clues, etc.'),
  terrain: z.string(),
  vegetation: z.string().optional().describe('Deprecated: use `biome` instead'),
  biome: BiomeEnum,
  elevation: z.number().int().describe('Weighted average elevation in feet'),
}).describe('HexSchema');
