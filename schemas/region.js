import { z } from 'zod';

export const RegionDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  hexIds: z.array(z.string()).optional(),
}).describe('Data for a region on a hex map');

export const RegionDatabaseSchema = z.array(
  RegionDataSchema
).describe('Database of regions on a hex map');
