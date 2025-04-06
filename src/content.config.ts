import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { BountySchema } from '../schemas/bounty';
import { CharacterSchema } from '../schemas/character';
import { ClassSchema } from '../schemas/class';
import { DungeonDataSchema } from '../schemas/dungeon';
import { FactionSchema } from '../schemas/faction';
import { FloatingClueSchema } from '../schemas/floating-clue';
import { HexSchema } from '../schemas/hex';
import { NpcSchema } from '../schemas/npc';
import { PlayerSchema } from '../schemas/player';
import { RandomEncounterSchema } from '../schemas/random-encounter';
import { RegionSchema } from '../schemas/region';
import { RumorSchema } from '../schemas/rumor';
import { SessionSchema } from '../schemas/session';
import { StatBlockSchema } from '../schemas/stat-block';
import { SupplementSchema } from '../schemas/supplement-list';
import { TreasureSchema } from '../schemas/treasure';
import type { HexData, RandomEncounterData, RegionData, StatBlockData } from './types.ts';

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
  NPCS: `${DATA_DIR}/npcs`,
  PLAYERS: `${DATA_DIR}/players`,
  REGIONS: `${DATA_DIR}/regions`,
  RUMORS: `${DATA_DIR}/rumors`,
  SESSIONS: `${DATA_DIR}/sessions`,
  STAT_BLOCKS: `${DATA_DIR}/stat-blocks`,
  SUPPLEMENTS: `${DATA_DIR}/supplements`,
  TREASURE: `${DATA_DIR}/treasure`,
} as const;

function getDirectoryYamlLoader<T>(directory: string): () => T[] {
  return () => {
    const DIRECTORY = path.join(process.cwd(), directory);
    const files = fs.readdirSync(DIRECTORY);
    const data = files.map(file => {
      const filePath = path.join(DIRECTORY, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      return yaml.parse(fileContents);
    });
    return data.flat();
  };
}

const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: DIRS.ARTICLES }),
  schema: z.object({
    title: z.string(),
    secure: z.boolean().optional(),
  }),
});

const bounties = defineCollection({
  loader: getDirectoryYamlLoader<RandomEncounterData>(DIRS.BOUNTIES),
  schema: {
    ...BountySchema,
  },
});

const characters = defineCollection({
  loader: glob({ pattern: "**/*.yml", base: DIRS.CHARACTERS }),
  schema: CharacterSchema,
});

const classes = defineCollection({
  loader: getDirectoryYamlLoader<RandomEncounterData>(DIRS.CLASSES),
  schema: {
    ...ClassSchema,
  },
});

const dungeons = defineCollection({
  loader: glob({ pattern: "**/*.md", base: DIRS.DUNGEONS }),
  schema: {
    ...DungeonDataSchema,
    hexId: reference('hexes'),
  },
});

const encounters = defineCollection({
  loader: getDirectoryYamlLoader<RandomEncounterData>(DIRS.ENCOUNTERS),
  schema: {
    ...RandomEncounterSchema,
  },
});

const factions = defineCollection({
  loader: getDirectoryYamlLoader<RandomEncounterData>(DIRS.FACTIONS),
  schema: {
    ...FactionSchema,
  },
});

const fixedClues = defineCollection({
  loader: glob({ pattern: "**/*.md", base: DIRS.FIXED_CLUES }),
  schema: z.object({
    title: z.string(),
  }),
});

const floatingClues = defineCollection({
  loader: getDirectoryYamlLoader<RandomEncounterData>(DIRS.FLOATING_CLUES),
  schema: {
    ...FloatingClueSchema,
  },
});

const gmNotes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: DIRS.GM_NOTES }),
  schema: z.object({
    title: z.string(),
  }),
});

const hexes = defineCollection({
  loader: getDirectoryYamlLoader<HexData>(DIRS.HEXES),
  schema: {
    ...HexSchema,
    regionId: reference('regions'),
  },
});

const npcs = defineCollection({
  loader: getDirectoryYamlLoader<RegionData>(DIRS.NPCS),
  schema: {
    ...NpcSchema,
  },
});

const players = defineCollection({
  loader: getDirectoryYamlLoader<RandomEncounterData>(DIRS.PLAYERS),
  schema: {
    ...PlayerSchema,
  },
});

const regions = defineCollection({
  loader: getDirectoryYamlLoader<RegionData>(DIRS.REGIONS),
  schema: {
    ...RegionSchema,
  },
});

const rumors = defineCollection({
  loader: getDirectoryYamlLoader<RegionData>(DIRS.RUMORS),
  schema: {
    ...RumorSchema,
  },
});

const sessions = defineCollection({
  loader: glob({ pattern: "**/*.yml", base: DIRS.SESSIONS }),
  schema: {
    ...SessionSchema,
  },
});

const statBlocks = defineCollection({
  loader: getDirectoryYamlLoader<StatBlockData>(DIRS.STAT_BLOCKS),
  schema: {
    ...StatBlockSchema,
  },
});

const supplements = defineCollection({
  loader: getDirectoryYamlLoader<StatBlockData>(DIRS.SUPPLEMENTS),
  schema: {
    ...SupplementSchema,
  },
});

const treasure = defineCollection({
  loader: getDirectoryYamlLoader<RandomEncounterData>(DIRS.TREASURE),
  schema: {
    ...TreasureSchema,
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
  gmNotes,
  hexes,
  npcs,
  players,
  regions,
  rumors,
  sessions,
  statBlocks,
  supplements,
  treasure,
};
