import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { BountySchema } from '../schemas/bounty';
import { CharacterSchema } from '../schemas/character';
import { ClassSchema } from '../schemas/class';
import { DungeonDataSchema } from '../schemas/dungeon';
import { EncounterSchema } from '../schemas/encounter';
import { FactionSchema } from '../schemas/faction';
import { FloatingClueSchema } from '../schemas/floating-clue';
import { HexSchema } from '../schemas/hex';
import { LootPackSchema } from '../schemas/loot-pack';
import { NpcSchema } from '../schemas/npc';
import { PlayerSchema } from '../schemas/player';
import { RegionSchema } from '../schemas/region';
import { RumorSchema } from '../schemas/rumor';
import { SessionSchema } from '../schemas/session';
import { StatBlockSchema } from '../schemas/stat-block';
import { SupplementSchema } from '../schemas/supplement-list';
import { TreasureSchema } from '../schemas/treasure';
import type {
  BountyData,
  ClassData,
  FactionData,
  LootPackData,
  NpcData,
  PlayerData,
  RumorData,
  SupplementData,
} from './types.ts';

const DATA_DIR = 'data';

const DIRS = {
  ARTICLES: `${DATA_DIR}/articles`,
  BOUNTIES: `${DATA_DIR}/bounties`,
  CHARACTERS: `${DATA_DIR}/characters`,
  CLASSES: `${DATA_DIR}/classes`,
  DUNGEONS: `${DATA_DIR}/dungeons`,
  ENCOUNTERS: `${DATA_DIR}/encounters`,
  FACTIONS: `${DATA_DIR}/factions`,
  FIXED_CLUES: `${DATA_DIR}/fixed-clues`,
  FLOATING_CLUES: `${DATA_DIR}/floating-clues`,
  GM_NOTES: `${DATA_DIR}/gm-notes`,
  HEXES: `${DATA_DIR}/hexes`,
  LOOT_PACKS: `${DATA_DIR}/loot-packs`,
  NPCS: `${DATA_DIR}/npcs`,
  PLAYERS: `${DATA_DIR}/players`,
  REGIONS: `${DATA_DIR}/regions`,
  RUMORS: `${DATA_DIR}/rumors`,
  SESSIONS: `${DATA_DIR}/sessions`,
  STAT_BLOCKS: `${DATA_DIR}/stat-blocks`,
  SUPPLEMENTS: `${DATA_DIR}/supplements`,
} as const;

function getDirectoryYamlLoader<T>(directory: string): () => T[] {
  return () => {
    const DIRECTORY = path.join(process.cwd(), directory);
    const files = fs.readdirSync(DIRECTORY);
    const data = files.map(file => {
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

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: DIRS.ARTICLES }),
  schema: z.object({
    title: z.string(),
    secure: z.boolean().optional(),
    showToc: z.boolean().optional(),
    treasure: z.record(z.string(), TreasureSchema).optional(),
    treasureRegionId: z.string().optional(),
  }),
});

const bounties = defineCollection({
  loader: getDirectoryYamlLoader<BountyData>(DIRS.BOUNTIES),
  schema: {
    ...BountySchema,
  },
});

const characters = defineCollection({
  loader: glob({ pattern: '**/*.yml', base: DIRS.CHARACTERS }),
  schema: CharacterSchema,
});

const classes = defineCollection({
  loader: getDirectoryYamlLoader<ClassData>(DIRS.CLASSES),
  schema: {
    ...ClassSchema,
  },
});

const dungeons = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: DIRS.DUNGEONS }),
  schema: {
    ...DungeonDataSchema,
    hexId: reference('hexes'),
  },
});

const encounters = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.ENCOUNTERS }),
  schema: {
    ...EncounterSchema,
  },
});

const factions = defineCollection({
  loader: getDirectoryYamlLoader<FactionData>(DIRS.FACTIONS),
  schema: {
    ...FactionSchema,
  },
});

const fixedClues = defineCollection({
  loader: glob({ pattern: '**/*.md', base: DIRS.FIXED_CLUES }),
  schema: z.object({
    title: z.string(),
  }),
});

const floatingClues = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.FLOATING_CLUES }),
  schema: {
    ...FloatingClueSchema,
  },
});

const hexes = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.HEXES }),
  schema: {
    ...HexSchema,
    regionId: reference('regions'),
  },
});

const lootPacks = defineCollection({
  loader: getDirectoryYamlLoader<LootPackData>(DIRS.LOOT_PACKS),
  schema: {
    ...LootPackSchema,
  },
});

const npcs = defineCollection({
  loader: getDirectoryYamlLoader<NpcData>(DIRS.NPCS),
  schema: {
    ...NpcSchema,
  },
});

const players = defineCollection({
  loader: getDirectoryYamlLoader<PlayerData>(DIRS.PLAYERS),
  schema: {
    ...PlayerSchema,
  },
});

const regions = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.REGIONS }),
  schema: {
    ...RegionSchema,
  },
});

const rumors = defineCollection({
  loader: getDirectoryYamlLoader<RumorData>(DIRS.RUMORS),
  schema: {
    ...RumorSchema,
  },
});

const sessions = defineCollection({
  loader: glob({ pattern: '**/*.yml', base: DIRS.SESSIONS }),
  schema: {
    ...SessionSchema,
  },
});

const statBlocks = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.STAT_BLOCKS }),
  schema: {
    ...StatBlockSchema,
  },
});

const supplements = defineCollection({
  loader: getDirectoryYamlLoader<SupplementData>(DIRS.SUPPLEMENTS),
  schema: {
    ...SupplementSchema,
  },
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
  fixedClues,
  hexes,
  'loot-packs': lootPacks,
  npcs,
  players,
  regions,
  rumors,
  sessions,
  statBlocks,
  supplements,
};
