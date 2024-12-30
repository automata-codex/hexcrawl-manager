import { z } from 'zod';
import { HexDataSchema } from '../schemas/hex-database.js';
import { RandomEncounterSchema } from '../schemas/random-encounter';
import { RandomEncounterTableSchema } from '../schemas/random-encounter-table';
import { RegionDataSchema } from '../schemas/region';

export type HexData = z.infer<typeof HexDataSchema>;
export type RandomEncounterData = z.infer<typeof RandomEncounterSchema>;
export type RandomEncounterTableData = z.infer<typeof RandomEncounterTableSchema>;
export type RegionData = z.infer<typeof RegionDataSchema>;
