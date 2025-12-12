import {
  type BountyData,
  BountySchema,
  CharacterSchema,
  type ClassData,
  ClassSchema,
  ClueSchema,
  CompositeArticleSchema,
  DungeonDataSchema,
  EncounterCategoryTableSchema,
  EncounterSchema,
  type FactionData,
  FactionSchema,
  FloatingClueSchema,
  HexSchema,
  KnowledgeNodeSchema,
  type LootPackData,
  LootPackSchema,
  MapPathSchema,
  type NpcData,
  NpcSchema,
  type PlayerData,
  PlayerSchema,
  PointcrawlEdgeSchema,
  PointcrawlNodeSchema,
  PointcrawlSchema,
  RegionSchema,
  RoleplayBookSchema,
  type RumorData,
  RumorSchema,
  SessionSchema,
  SpellSchema,
  StatBlockSchema,
  type SupplementData,
  SupplementSchema,
  type TrailEntry,
  TrailEntrySchema,
  TrailsFile,
  TreasureSchema,
} from '@skyreach/schemas';
import { file, glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const DATA_DIR = '../../data';

const DIRS = {
  ARTICLES: `${DATA_DIR}/articles`,
  BOUNTIES: `${DATA_DIR}/bounties`,
  CHARACTERS: `${DATA_DIR}/characters`,
  CLASSES: `${DATA_DIR}/classes`,
  CLUES: `${DATA_DIR}/clues`,
  COMPOSITE_ARTICLES: `${DATA_DIR}/composite-articles`,
  DUNGEONS: `${DATA_DIR}/dungeons`,
  ENCOUNTER_CATEGORY_TABLES: `${DATA_DIR}/encounter-category-tables`,
  ENCOUNTERS: `${DATA_DIR}/encounters`,
  FACTIONS: `${DATA_DIR}/factions`,
  FLOATING_CLUES: `${DATA_DIR}/floating-clues`,
  GM_NOTES: `${DATA_DIR}/gm-notes`,
  HEXES: `${DATA_DIR}/hexes`,
  KNOWLEDGE_TREES: `${DATA_DIR}/knowledge-trees`,
  LOOT_PACKS: `${DATA_DIR}/loot-packs`,
  MAP_PATHS: `${DATA_DIR}/map-paths`,
  NPCS: `${DATA_DIR}/npcs`,
  PLAYERS: `${DATA_DIR}/players`,
  PLOTLINES: `${DATA_DIR}/plotlines`,
  POINTCRAWLS: `${DATA_DIR}/pointcrawls`,
  POINTCRAWL_EDGES: `${DATA_DIR}/pointcrawl-edges`,
  POINTCRAWL_NODES: `${DATA_DIR}/pointcrawl-nodes`,
  REGIONS: `${DATA_DIR}/regions`,
  ROLEPLAY_BOOKS: `${DATA_DIR}/roleplay-books`,
  RUMORS: `${DATA_DIR}/rumors`,
  SESSIONS: `${DATA_DIR}/sessions`,
  SPELLS: `${DATA_DIR}/spells`,
  STAT_BLOCKS: `${DATA_DIR}/stat-blocks`,
  SUPPLEMENTS: `${DATA_DIR}/supplements`,
  TRAILS: `${DATA_DIR}/trails`,
} as const;

/** @deprecated */
function getDirectoryYamlLoader<T>(directory: string): () => T[] {
  return () => {
    const DIRECTORY = path.join(process.cwd(), directory);
    const files = fs.readdirSync(DIRECTORY);
    const data = files.map((file) => {
      if (path.extname(file) !== '.yml' && path.extname(file) !== '.yaml') {
        return [];
      }
      const filePath = path.join(DIRECTORY, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      return yaml.parse(fileContents);
    });
    return data.flat();
  };
}

export function trailsMapToEntries(input: unknown): TrailEntry[] {
  const obj = TrailsFile.parse(input);
  return Object.entries(obj).map(([id, data]) =>
    TrailEntrySchema.parse({ id, ...data }),
  );
}

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: DIRS.ARTICLES }),
  schema: z.object({
    id: z.string(), // Unique identifier for the article
    secure: z.boolean().optional(),
    showToc: z.boolean().optional(),
    slug: z.string().optional(), // Full URL path; optional for composite article parts
    title: z.string(),
    treasure: z.record(z.string(), TreasureSchema).optional(),
    treasureRegionId: z.string().optional(),
  }),
});

const bounties = defineCollection({
  loader: getDirectoryYamlLoader<BountyData>(DIRS.BOUNTIES),
  schema: BountySchema,
});

const characters = defineCollection({
  loader: glob({ pattern: '**/*.yml', base: DIRS.CHARACTERS }),
  schema: CharacterSchema,
});

const classes = defineCollection({
  loader: getDirectoryYamlLoader<ClassData>(DIRS.CLASSES),
  schema: ClassSchema,
});

const clues = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.CLUES }),
  schema: ClueSchema,
});

const compositeArticles = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.COMPOSITE_ARTICLES }),
  schema: CompositeArticleSchema,
});

const dungeons = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: DIRS.DUNGEONS }),
  schema: DungeonDataSchema,
});

const encounterCategoryTables = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.ENCOUNTER_CATEGORY_TABLES }),
  schema: EncounterCategoryTableSchema,
});

const encounters = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.ENCOUNTERS }),
  schema: EncounterSchema,
});

const factions = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.FACTIONS }),
  schema: FactionSchema,
});

const floatingClues = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.FLOATING_CLUES }),
  schema: FloatingClueSchema,
});

const hexes = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.HEXES }),
  schema: HexSchema,
});

const knowledgeTrees = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.KNOWLEDGE_TREES }),
  schema: KnowledgeNodeSchema,
});

const lootPacks = defineCollection({
  loader: getDirectoryYamlLoader<LootPackData>(DIRS.LOOT_PACKS),
  schema: LootPackSchema,
});

const mapPaths = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.MAP_PATHS }),
  schema: MapPathSchema,
});

const npcs = defineCollection({
  loader: getDirectoryYamlLoader<NpcData>(DIRS.NPCS),
  schema: NpcSchema,
});

const players = defineCollection({
  loader: getDirectoryYamlLoader<PlayerData>(DIRS.PLAYERS),
  schema: PlayerSchema,
});

// in your content config
const plotlines = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: DIRS.PLOTLINES }),
  schema: z.object({
    slug: z.string(),
    status: z.enum(['active', 'dormant', 'resolved']).default('active'),
    summary: z.string().optional(),
    title: z.string(),
  }),
});

const pointcrawls = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.POINTCRAWLS }),
  schema: PointcrawlSchema,
});

const pointcrawlEdges = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: DIRS.POINTCRAWL_EDGES }),
  schema: PointcrawlEdgeSchema,
});

const pointcrawlNodes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: DIRS.POINTCRAWL_NODES }),
  schema: PointcrawlNodeSchema,
});

const regions = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.REGIONS }),
  schema: RegionSchema,
});

const roleplayBooks = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.ROLEPLAY_BOOKS }),
  schema: RoleplayBookSchema,
});

const rumors = defineCollection({
  loader: getDirectoryYamlLoader<RumorData>(DIRS.RUMORS),
  schema: RumorSchema,
});

const sessions = defineCollection({
  loader: glob({ pattern: '**/*.yml', base: DIRS.SESSIONS }),
  schema: SessionSchema,
});

const spells = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.SPELLS }),
  schema: SpellSchema,
});

const statBlocks = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.STAT_BLOCKS }),
  schema: StatBlockSchema,
});

const supplements = defineCollection({
  loader: getDirectoryYamlLoader<SupplementData>(DIRS.SUPPLEMENTS),
  schema: SupplementSchema,
});

const trails = defineCollection({
  loader: file(`${DATA_DIR}/trails.yml`, {
    parser: (raw) => {
      const obj = yaml.parse(raw);
      return trailsMapToEntries(obj);
    },
  }),
  schema: TrailEntrySchema,
});

export const collections = {
  articles,
  bounties,
  characters,
  classes,
  clues,
  'composite-articles': compositeArticles,
  dungeons,
  'encounter-category-tables': encounterCategoryTables,
  encounters,
  factions,
  floatingClues,
  hexes,
  'knowledge-trees': knowledgeTrees,
  'loot-packs': lootPacks,
  'map-paths': mapPaths,
  npcs,
  players,
  plotlines,
  pointcrawls,
  'pointcrawl-edges': pointcrawlEdges,
  'pointcrawl-nodes': pointcrawlNodes,
  regions,
  'roleplay-books': roleplayBooks,
  rumors,
  sessions,
  spells,
  statBlocks,
  supplements,
  trails,
};
