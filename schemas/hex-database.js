import { z } from 'zod';

export const HexDataSchema = z.object({
 id: z.string(),
 name: z.string(),
 coordinates: z.tuple([z.string(), z.number()]).optional(), // We can derive coordinates from the id, but this is still in the schema for backwards compatibility.
 landmark: z.string(),
 hiddenSites: z.array(z.string()).optional(),
 regionId: z.string(),
 hideInCatalog: z.boolean().optional(),
}).describe('Data for a hex in a hex map.');

export const HexDatabaseSchema = z.array(
    HexDataSchema
).describe('Data for hexes in a hex map.');
