import { z } from 'zod';
import { DungeonDataSchema } from '../schemas/dungeon';
import { HexDataSchema } from '../schemas/hex-database.js';
import { RandomEncounterSchema } from '../schemas/random-encounter';
import { RandomEncounterTableSchema } from '../schemas/random-encounter-table';
import { RegionDataSchema } from '../schemas/region';
import { StatBlockSchema, skillsSchema } from '../schemas/stat-block.js';

export type DungeonData = z.infer<typeof DungeonDataSchema>;
export type HexData = z.infer<typeof HexDataSchema>;
export type RandomEncounterData = z.infer<typeof RandomEncounterSchema>;
export type RandomEncounterTableData = z.infer<typeof RandomEncounterTableSchema>;
export type RegionData = z.infer<typeof RegionDataSchema>;
export type StatBlockData = z.infer<typeof StatBlockSchema>;
export type StatBlockSkills = z.infer<typeof skillsSchema>;
