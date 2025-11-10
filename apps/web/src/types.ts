import type {
  EncounterEntryData,
  HexData,
  HiddenSitesData,
  KnowledgeNodeData,
  TreasureData,
} from '@skyreach/schemas';
import type { CollectionEntry } from 'astro:content';

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
export type RoleplayBookEntry = CollectionEntry<'roleplay-books'>;

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
