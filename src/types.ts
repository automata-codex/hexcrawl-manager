import { z } from 'zod';
import { HexDataSchema, HexDatabaseSchema } from '../schemas/hex-database.js';

export type HexData = z.infer<typeof HexDataSchema>;
export type HexDatabase = z.infer<typeof HexDatabaseSchema>;
