import { z } from 'zod';
import { CharacterSchema } from '../schemas/character';
import { DungeonDataSchema } from '../schemas/dungeon';
import { FactionSchema } from '../schemas/faction';
import { FloatingClueSchema } from '../schemas/floating-clue';
import { HexSchema } from '../schemas/hex.js';
import { PlayerSchema } from '../schemas/player';
import { RandomEncounterSchema } from '../schemas/random-encounter';
import { RandomEncounterTableSchema } from '../schemas/random-encounter-table';
import { RegionSchema } from '../schemas/region';
import { RumorSchema } from '../schemas/rumor';
import { ScopeSchema } from '../schemas/scopes';
import { SessionSchema } from '../schemas/session';
import {
  DescriptiveActionSchema,
  MeleeWeaponAttackSchema,
  RangedWeaponAttackSchema,
  SkillsSchema,
  SpecialActionSchema,
  StatBlockSchema
} from '../schemas/stat-block.js';
import type { CollectionEntry } from 'astro:content';

export type CharacterData = z.infer<typeof CharacterSchema>;
export type DescriptiveActionData = z.infer<typeof DescriptiveActionSchema>;
export type DungeonData = z.infer<typeof DungeonDataSchema>;
export type FactionData = z.infer<typeof FactionSchema>;
export type FloatingClueData = z.infer<typeof FloatingClueSchema>;
export type HexData = z.infer<typeof HexSchema>;
export type MeleeWeaponAttackData = z.infer<typeof MeleeWeaponAttackSchema>;
export type PlayerData = z.infer<typeof PlayerSchema>;
export type RandomEncounterData = z.infer<typeof RandomEncounterSchema>;
export type RandomEncounterTableData = z.infer<typeof RandomEncounterTableSchema>;
export type RangedWeaponAttackData = z.infer<typeof RangedWeaponAttackSchema>;
export type RegionData = z.infer<typeof RegionSchema>;
export type RumorData = z.infer<typeof RumorSchema>;
export type Scope = z.infer<typeof ScopeSchema>;
export type SessionData = z.infer<typeof SessionSchema>;
export type SpecialActionData = z.infer<typeof SpecialActionSchema>;
export type StatBlockData = z.infer<typeof StatBlockSchema>;
export type StatBlockSkillsData = z.infer<typeof SkillsSchema>;

export type DungeonEntry = CollectionEntry<'dungeons'>;

export type Pillar = keyof CharacterData['advancementPoints'];
