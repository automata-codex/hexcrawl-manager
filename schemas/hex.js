import { z } from 'zod';
import { EncounterOverrideSchema } from './encounter-table.js';
import { RandomEncounterTableSchema } from './random-encounter-table.js';

export const HexSchema = z.object({
  id: z.string(),
  name: z.string(),
  coordinates: z.tuple([z.string(), z.number()]).optional(), // We can derive coordinates from the id, but this is still in the schema for backwards compatibility.
  landmark: z.string(),
  hiddenSites: z.array(z.string()).optional(),
  secretSite: z.string().optional(),
  regionId: z.string(),
  hideInCatalog: z.boolean().optional(),
  isVisited: z.boolean().optional(),
  isExplored: z.boolean().optional(),
  encounterChance: z.number().int().min(1).max(20).optional(),
  encounters: RandomEncounterTableSchema.optional(),
  encounterOverrides: EncounterOverrideSchema.optional(),
  notes: z.array(z.string()).optional(), // Private GM eyes-only notes
  updates: z.array(z.string()).optional(), // Private GM-only changes to the hex since the last visit
}).describe('Data for a hex in a hex map.');
