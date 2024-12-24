import { z } from 'zod';
import { HexDataSchema } from '../schemas/hex-database.js';
import type { RegionDataSchema } from '../schemas/region';

export type HexData = z.infer<typeof HexDataSchema>;
export type RegionData = z.infer<typeof RegionDataSchema>;
