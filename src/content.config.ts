import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { DungeonDataSchema } from '../schemas/dungeon';
import { HexDataSchema } from '../schemas/hex-database';
import { RandomEncounterSchema } from '../schemas/random-encounter';
import { RegionDataSchema } from '../schemas/region';
import { StatBlockSchema } from '../schemas/stat-block';
import type { HexData, RandomEncounterData, RegionData, StatBlockData } from './types.ts';

const DATA_DIR = 'data';

const DIRS = {
  DUNGEONS: `${DATA_DIR}/dungeons`,
  ENCOUNTERS: `${DATA_DIR}/encounters`,
  HEXES: `${DATA_DIR}/hexes`,
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

const hexes = defineCollection({
  loader: getDirectoryYamlLoader<HexData>(DIRS.HEXES),
  schema: {
    ...HexDataSchema,
    regionId: reference('regions'),
  },
});

const regions = defineCollection({
  loader: getDirectoryYamlLoader<RegionData>(DIRS.REGIONS),
  schema: {
    ...RegionDataSchema,
  },
});

const statBlocks = defineCollection({
  loader: getDirectoryYamlLoader<StatBlockData>(DIRS.STAT_BLOCKS),
  schema: {
    ...StatBlockSchema,
  },
});

export const collections = { dungeons, encounters, hexes, regions, statBlocks };
