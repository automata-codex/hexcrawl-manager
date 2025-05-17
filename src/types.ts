import type { CollectionEntry } from 'astro:content';
import { z } from 'zod';
import { CampaignDateSchema } from './config/campaign-date.ts';
import { BountySchema } from '../schemas/bounty';
import { CharacterSchema } from '../schemas/character';
import { ClassSchema } from '../schemas/class';
import { DungeonDataSchema } from '../schemas/dungeon';
import { FactionSchema } from '../schemas/faction';
import { FloatingClueSchema } from '../schemas/floating-clue';
import { EncounterSchema } from '../schemas/encounter';
import { EncounterOverrideSchema } from '../schemas/encounter-override.js';
import {
  CategoryTable,
  EncounterEntrySchema,
  EncounterTableSchema,
  TieredSubtableSchema,
} from '../schemas/encounter-table';
import { HexSchema, HiddenSitesSchema } from '../schemas/hex.js';
import { KnowledgeNodeSchema } from '../schemas/knowledge-node';
import { LootPackSchema } from '../schemas/loot-pack';
import type { SegmentMetadataSchema } from '../schemas/map-path';
import { NpcSchema } from '../schemas/npc';
import { PlayerSchema } from '../schemas/player';
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
import { TrailSchema } from '../schemas/trail';
import { TreasureSchema } from '../schemas/treasure';

export type BountyData = z.infer<typeof BountySchema>;
export type CategoryTableData = z.infer<typeof CategoryTable>;
export type CampaignDate = z.infer<typeof CampaignDateSchema>;
export type CharacterData = z.infer<typeof CharacterSchema>;
export type ClassData = z.infer<typeof ClassSchema>;
export type DescriptiveActionData = z.infer<typeof DescriptiveActionSchema>;
export type DungeonData = z.infer<typeof DungeonDataSchema>;
export type EncounterData = z.infer<typeof EncounterSchema>;
export type EncounterEntryData = z.infer<typeof EncounterEntrySchema>;
export type EncounterOverrideData = z.infer<typeof EncounterOverrideSchema>;
export type EncounterTableData = z.infer<typeof EncounterTableSchema>;
export type FactionData = z.infer<typeof FactionSchema>;
export type FloatingClueData = z.infer<typeof FloatingClueSchema>;
export type HexData = z.infer<typeof HexSchema>;
export type HiddenSitesData = z.infer<typeof HiddenSitesSchema>;
export type KnowledgeNodeData = z.infer<typeof KnowledgeNodeSchema>;
export type LootPackData = z.infer<typeof LootPackSchema>;
export type MeleeWeaponAttackData = z.infer<typeof MeleeWeaponAttackSchema>;
export type NpcData = z.infer<typeof NpcSchema>;
export type PlayerData = z.infer<typeof PlayerSchema>;
export type RangedWeaponAttackData = z.infer<typeof RangedWeaponAttackSchema>;
export type RegionData = z.infer<typeof RegionSchema>;
export type RumorData = z.infer<typeof RumorSchema>;
export type Scope = z.infer<typeof ScopeSchema>;
export type SegmentMetadataData = z.infer<typeof SegmentMetadataSchema>;
export type SessionData = z.infer<typeof SessionSchema>;
export type SpecialActionData = z.infer<typeof SpecialActionSchema>;
export type StatBlockData = z.infer<typeof StatBlockSchema>;
export type SupplementData = z.infer<typeof SupplementSchema>;
export type StatBlockSkillsData = z.infer<typeof SkillsSchema>;
export type TieredSubtableData = z.infer<typeof TieredSubtableSchema>
export type TrailData = z.infer<typeof TrailSchema>;
export type TreasureData = z.infer<typeof TreasureSchema>;

export type ExtendedHexData = HexData & {
  renderedHiddenSites: ExtendedHiddenSites[];
  renderedNotes: string[];
  renderedLandmark: string;
  renderedSecretSite: string;
  renderedUpdates: string[];
}
export type ExtendedHiddenSites = HiddenSitesData & {
  description: string;
  treasure?: ExtendedTreasureData[];
}
export type ExtendedTreasureData = TreasureData & {
  renderedNotes: string;
}

export type ArticleEntry = CollectionEntry<'articles'>;
export type DungeonEntry = CollectionEntry<'dungeons'>;
export type FloatingClueEntry = CollectionEntry<'floatingClues'>;
export type HexEntry = CollectionEntry<'hexes'>;
export type RegionEntry = CollectionEntry<'regions'>;
export type TrailEntry = CollectionEntry<'trails'>;

export type ClueLink = {
  clueId: string;
  name: string;
  summary: string;
  linkedHexes: {
    hexId: string;
    score: number;
  }[];
}

export type EncounterCategoryTables = Record<string, Record<string, EncounterEntryData[]>>;

export type FlatKnowledgeTree = Record<string, KnowledgeNodeData>;

export type Pillar = keyof CharacterData['advancementPoints'];

export type PlacementMap = Record<string, PlacementRef[]>;

export interface PlacementRef {
  type: 'hex' | 'hidden-site' | 'dungeon' | 'floating-clue';
  id: string;
  label: string;
}

export type PlacementType = PlacementRef['type'];

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
