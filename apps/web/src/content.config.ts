import {
  type BountyData,
  BountySchema,
  CharacterSchema,
  type ClassData,
  ClassSchema,
  DungeonDataSchema,
  EncounterSchema,
  type FactionData,
  FactionSchema,
  FloatingClueSchema,
  HexSchema,
  type LootPackData,
  LootPackSchema,
  MapPathSchema,
  type NpcData,
  NpcSchema,
  type PlayerData,
  PlayerSchema,
  RegionSchema,
  type RumorData,
  RumorSchema,
  SessionSchema,
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
  DUNGEONS: `${DATA_DIR}/dungeons`,
  ENCOUNTERS: `${DATA_DIR}/encounters`,
  FACTIONS: `${DATA_DIR}/factions`,
  FLOATING_CLUES: `${DATA_DIR}/floating-clues`,
  GM_NOTES: `${DATA_DIR}/gm-notes`,
  HEXES: `${DATA_DIR}/hexes`,
  LOOT_PACKS: `${DATA_DIR}/loot-packs`,
  MAP_PATHS: `${DATA_DIR}/map-paths`,
  NPCS: `${DATA_DIR}/npcs`,
  PLAYERS: `${DATA_DIR}/players`,
  REGIONS: `${DATA_DIR}/regions`,
  RUMORS: `${DATA_DIR}/rumors`,
  SESSIONS: `${DATA_DIR}/sessions`,
  STAT_BLOCKS: `${DATA_DIR}/stat-blocks`,
  SUPPLEMENTS: `${DATA_DIR}/supplements`,
  TRAILS: `${DATA_DIR}/trails`,
} as const;

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
    secure: z.boolean().optional(),
    slug: z.string().optional(),
    showToc: z.boolean().optional(),
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

const dungeons = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: DIRS.DUNGEONS }),
  schema: DungeonDataSchema,
});

const encounters = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.ENCOUNTERS }),
  schema: EncounterSchema,
});

const factions = defineCollection({
  loader: getDirectoryYamlLoader<FactionData>(DIRS.FACTIONS),
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

const regions = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.REGIONS }),
  schema: RegionSchema,
});

const rumors = defineCollection({
  loader: getDirectoryYamlLoader<RumorData>(DIRS.RUMORS),
  schema: RumorSchema,
});

const sessions = defineCollection({
  loader: glob({ pattern: '**/*.yml', base: DIRS.SESSIONS }),
  schema: SessionSchema,
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
  dungeons,
  encounters,
  factions,
  floatingClues,
  hexes,
  'loot-packs': lootPacks,
  'map-paths': mapPaths,
  npcs,
  players,
  regions,
  rumors,
  sessions,
  statBlocks,
  supplements,
  trails,
};
