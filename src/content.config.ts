import { defineCollection, reference, z } from 'astro:content';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { HexDataSchema } from '../schemas/hex-database';
import type { HexData, RegionData } from './types.ts';
import { RegionDataSchema } from '../schemas/region';

const DATA_DIR = 'data';

const DIRS = {
  ENCOUNTERS: `${DATA_DIR}/encounters`,
  HEXES: `${DATA_DIR}/hexes`,
  REGIONS: `${DATA_DIR}/regions`,
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

const encounters = defineCollection({
  loader: getDirectoryYamlLoader(DIRS.ENCOUNTERS),
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

export const collections = { encounters, hexes, regions };
