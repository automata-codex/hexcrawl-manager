import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { DungeonDataSchema } from '../schemas/dungeon';
import { FloatingClueSchema } from '../schemas/floating-clue';
import { HexSchema } from '../schemas/hex';
import { NpcDataSchema } from '../schemas/npc';
import { RandomEncounterSchema } from '../schemas/random-encounter';
import { RegionSchema } from '../schemas/region';
import { StatBlockSchema } from '../schemas/stat-block';
import type { HexData, RandomEncounterData, RegionData, StatBlockData } from './types.ts';

const DATA_DIR = 'data';

const DIRS = {
  DUNGEONS: `${DATA_DIR}/dungeons`,
  ENCOUNTERS: `${DATA_DIR}/encounters`,
  FLOATING_CLUES: `${DATA_DIR}/floating-clues`,
  GM_NOTES: `${DATA_DIR}/gm-notes`,
  HEXES: `${DATA_DIR}/hexes`,
  MISC_PAGES: `${DATA_DIR}/miscellaneous-pages`,
  NPCS: `${DATA_DIR}/npcs`,
  REGIONS: `${DATA_DIR}/regions`,
  STAT_BLOCKS: `${DATA_DIR}/stat-blocks`,
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

const miscPages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: DIRS.MISC_PAGES }),
  schema: z.object({
    title: z.string(),
  }),
});

const npcs = defineCollection({
  loader: getDirectoryYamlLoader<RegionData>(DIRS.NPCS),
  schema: {
    ...NpcDataSchema,
  },
});

const regions = defineCollection({
  loader: getDirectoryYamlLoader<RegionData>(DIRS.REGIONS),
  schema: {
    ...RegionSchema,
  },
});

const statBlocks = defineCollection({
  loader: getDirectoryYamlLoader<StatBlockData>(DIRS.STAT_BLOCKS),
  schema: {
    ...StatBlockSchema,
  },
});

export const collections = {
  dungeons,
  encounters,
  floatingClues,
  gmNotes,
  hexes,
  miscPages,
  npcs,
  regions,
  statBlocks,
};
