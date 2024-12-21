import { z } from 'zod';

export const HexDataSchema = z.object({
 id: z.string(),
}).describe('Data for a hex in a hex map.');

export const HexDatabaseSchema = z.array(
    HexDataSchema
).describe('Data for hexes in a hex map.');
