import { z } from 'zod';
import { CharacterSchema } from '../schemas/character';
import { DungeonDataSchema } from '../schemas/dungeon';
import { FactionSchema } from '../schemas/faction';
import { HexSchema } from '../schemas/hex.js';
import { RandomEncounterSchema } from '../schemas/random-encounter';
import { RandomEncounterTableSchema } from '../schemas/random-encounter-table';
import { RegionSchema } from '../schemas/region';
import { ScopeSchema } from '../schemas/scopes';
import { SessionSchema } from '../schemas/session';
import {
  DescriptiveActionSchema,
  MeleeWeaponAttackSchema,
  RangedWeaponAttackSchema,
  SkillsSchema,
  StatBlockSchema,
} from '../schemas/stat-block.js';

export type CharacterData = z.infer<typeof CharacterSchema>;
export type DescriptiveActionData = z.infer<typeof DescriptiveActionSchema>;
export type DungeonData = z.infer<typeof DungeonDataSchema>;
export type FactionData = z.infer<typeof FactionSchema>;
export type HexData = z.infer<typeof HexSchema>;
export type MeleeWeaponAttackData = z.infer<typeof MeleeWeaponAttackSchema>;
export type RandomEncounterData = z.infer<typeof RandomEncounterSchema>;
export type RandomEncounterTableData = z.infer<typeof RandomEncounterTableSchema>;
export type RangedWeaponAttackData = z.infer<typeof RangedWeaponAttackSchema>;
export type RegionData = z.infer<typeof RegionSchema>;
export type Scope = z.infer<typeof ScopeSchema>;
export type SessionData = z.infer<typeof SessionSchema>;
export type StatBlockData = z.infer<typeof StatBlockSchema>;
export type StatBlockSkillsData = z.infer<typeof SkillsSchema>;

export type Pillar = keyof CharacterData['advancementPoints'];
