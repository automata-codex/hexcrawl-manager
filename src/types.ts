import type { CollectionEntry } from 'astro:content';
import { z } from 'zod';
import { BountySchema } from '../schemas/bounty';
import { CharacterSchema } from '../schemas/character';
import { ClassSchema } from '../schemas/class';
import { DungeonDataSchema } from '../schemas/dungeon';
import { FactionSchema } from '../schemas/faction';
import { FloatingClueSchema } from '../schemas/floating-clue';
import { EncounterEntrySchema } from '../schemas/encounter-entry';
import { HexSchema } from '../schemas/hex.js';
import { NpcSchema } from '../schemas/npc';
import { PlayerSchema } from '../schemas/player';
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
import { SupplementSchema } from '../schemas/supplement-list';
import { TreasureSchema } from '../schemas/treasure';

export type BountyData = z.infer<typeof BountySchema>;
export type CharacterData = z.infer<typeof CharacterSchema>;
export type ClassData = z.infer<typeof ClassSchema>;
export type DescriptiveActionData = z.infer<typeof DescriptiveActionSchema>;
export type DungeonData = z.infer<typeof DungeonDataSchema>;
export type EncounterEntryData = z.infer<typeof EncounterEntrySchema>;
export type FactionData = z.infer<typeof FactionSchema>;
export type FloatingClueData = z.infer<typeof FloatingClueSchema>;
export type HexData = z.infer<typeof HexSchema>;
export type MeleeWeaponAttackData = z.infer<typeof MeleeWeaponAttackSchema>;
export type NpcData = z.infer<typeof NpcSchema>;
export type PlayerData = z.infer<typeof PlayerSchema>;
export type RandomEncounterTableData = z.infer<typeof RandomEncounterTableSchema>;
export type RangedWeaponAttackData = z.infer<typeof RangedWeaponAttackSchema>;
export type RegionData = z.infer<typeof RegionSchema>;
export type RumorData = z.infer<typeof RumorSchema>;
export type Scope = z.infer<typeof ScopeSchema>;
export type SessionData = z.infer<typeof SessionSchema>;
export type SpecialActionData = z.infer<typeof SpecialActionSchema>;
export type StatBlockData = z.infer<typeof StatBlockSchema>;
export type SupplementData = z.infer<typeof SupplementSchema>;
export type StatBlockSkillsData = z.infer<typeof SkillsSchema>;
export type TreasureData = z.infer<typeof TreasureSchema>;

export type DungeonEntry = CollectionEntry<'dungeons'>;

export type Pillar = keyof CharacterData['advancementPoints'];

export interface SidebarSection {
  id: string;
  label: string;
  items: {
    id: string;
    label: string;
    href?: string;
    expandable?: boolean;
    items?: { label: string; href: string }[];
  }[];
}
