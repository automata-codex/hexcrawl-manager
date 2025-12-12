import type {
  EncounterEntryData,
  HexData,
  HiddenSite,
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
export type ExtendedHiddenSites = HiddenSite & {
  description: string;
  treasure?: ExtendedTreasureData[];
};
export type ExtendedTreasureData = TreasureData & {
  renderedNotes: string;
};

export type ClueMapEntry = {
  id: string;
  name: string;
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

export type PointcrawlLink = {
  slug: string;
  name: string;
};

export type EncounterCategoryTables = Record<
  string,
  Record<string, EncounterEntryData[]>
>;

export type FlatKnowledgeTree = Record<string, KnowledgeNodeData>;

export type PlacementMap = Record<string, PlacementRef[]>;

export interface PlacementRef {
  type: 'hex' | 'hidden-site' | 'dungeon' | 'floating-clue' | 'pointcrawl' | 'pointcrawl-node' | 'pointcrawl-edge' | 'encounter';
  id: string;
  label: string;
}

export type PlacementType = PlacementRef['type'];

/**
 * Typed href that references content by type and ID/path
 */
export interface ArticleHref {
  type: 'article';
  id: string;
}

export interface CompositeHref {
  type: 'composite';
  id: string;
}

export interface CollectionHref {
  type: 'collection';
  path: string;
}

export type TypedHref = ArticleHref | CompositeHref | CollectionHref;
export type SidebarHref = TypedHref | string;

export interface SidebarItem {
  id?: string;
  label: string;
  href?: SidebarHref;
  expandable?: boolean;
  hasToC?: boolean;
  tocHref?: string;
  items?: SidebarItem[];
}

export interface SidebarSection {
  id: string;
  label: string;
  href?: SidebarHref; // Link to section's ToC page
  items: SidebarItem[];
}
