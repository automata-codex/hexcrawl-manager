import { z } from 'zod';

import { BountySchema } from '../schemas/bounty';
import { CharacterSchema } from '../schemas/character';
import { ClassSchema } from '../schemas/class';
import { DungeonDataSchema } from '../schemas/dungeon';
import { EncounterSchema } from '../schemas/encounter';
import { EncounterOverrideSchema } from '../schemas/encounter-override.js';
import {
  CategoryTable,
  EncounterEntrySchema,
  EncounterTableSchema,
} from '../schemas/encounter-table';
import { FactionSchema } from '../schemas/faction';
import { FloatingClueSchema } from '../schemas/floating-clue';
import { HexSchema, HiddenSitesSchema } from '../schemas/hex.js';
import { KnowledgeNodeSchema } from '../schemas/knowledge-node';
import { LootPackSchema } from '../schemas/loot-pack';
import { NpcSchema } from '../schemas/npc';
import { PlayerSchema } from '../schemas/player';
import {
  DescriptiveActionSchema,
  MeleeWeaponAttackSchema,
  RangedWeaponAttackSchema,
} from '../schemas/stat-block.js';

import { CampaignDateSchema } from './config/campaign-date.ts';

import type { MetaSchema } from '../schemas/meta';
import type { TreasureData } from '@skyreach/schemas';
import type { CollectionEntry } from 'astro:content';

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
export type MetaData = z.infer<typeof MetaSchema>;
export type NpcData = z.infer<typeof NpcSchema>;
export type PlayerData = z.infer<typeof PlayerSchema>;
export type RangedWeaponAttackData = z.infer<typeof RangedWeaponAttackSchema>;

export type ExtendedHexData = HexData & {
  renderedHiddenSites: ExtendedHiddenSites[];
  renderedNotes: string[];
  renderedLandmark: string;
  renderedSecretSite: string;
  renderedUpdates: string[];
};
export type ExtendedHiddenSites = HiddenSitesData & {
  description: string;
  treasure?: ExtendedTreasureData[];
};
export type ExtendedTreasureData = TreasureData & {
  renderedNotes: string;
};

export type ArticleEntry = CollectionEntry<'articles'>;
export type DungeonEntry = CollectionEntry<'dungeons'>;
export type FloatingClueEntry = CollectionEntry<'floatingClues'>;
export type HexEntry = CollectionEntry<'hexes'>;
export type RegionEntry = CollectionEntry<'regions'>;

export type ClueLink = {
  clueId: string;
  name: string;
  summary: string;
  linkedHexes: {
    hexId: string;
    score: number;
  }[];
};

export type EncounterCategoryTables = Record<
  string,
  Record<string, EncounterEntryData[]>
>;

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
