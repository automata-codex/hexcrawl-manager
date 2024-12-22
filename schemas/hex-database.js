import { z } from 'zod';

export const HexDataSchema = z.object({
 id: z.string(),
 name: z.string(),
 coordinates: z.tuple([z.string(), z.number()]),
 landmark: z.string(),
 hiddenSites: z.array(z.string()),
}).describe('Data for a hex in a hex map.');

export const HexDatabaseSchema = z.array(
    HexDataSchema
).describe('Data for hexes in a hex map.');
