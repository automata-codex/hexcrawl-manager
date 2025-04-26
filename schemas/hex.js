import { z } from 'zod';
import { EncounterOverrideSchema } from './encounter-override.js';
import { TreasureSchema } from './treasure.js';

export const HiddenSitesSchema = z.object({
  description: z.string(),
  treasure: z.array(TreasureSchema).optional(),
  unlocks: z.array(z.string())
    .optional()
    .describe('IDs of knowledge nodes that are unlocked by this site'),
});

export const LandmarkSchema = z.object({
  description: z.string(),
  unlocks: z.array(z.string())
    .optional()
    .describe('IDs of knowledge nodes that are unlocked by this site'),
});

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
  notes: z.array(z.string())
    .optional()
    .describe('Private GM eyes-only notes'),
  updates: z.array(z.string())
    .optional()
    .describe('Private GM-only changes to the hex since the last visit'),
  tags: z.array(z.string())
    .optional()
    .describe('Tags for filtering hexes, matching clues, etc.'),
}).describe('HexSchema');
