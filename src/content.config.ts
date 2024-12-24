import {
  defineCollection,
  getCollection,
  getEntries,
  getEntry,
  reference,
  z,
} from 'astro:content';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { HexDataSchema } from '../schemas/hex-database';
import type { HexData, RegionData } from './types.ts';
import { RegionDataSchema } from '../schemas/region';

const DATA_DIR = 'data';

const DIRS = {
  HEXES: `${DATA_DIR}/hexes`,
  REGIONS: `${DATA_DIR}/regions`
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

const hexes = defineCollection({
  loader: getDirectoryYamlLoader<HexData>(DIRS.HEXES),
  schema: {
    ...HexDataSchema,
    regionId: reference('regions')
  }
});

const regions = defineCollection({
  loader: async () => {
    const loader = getDirectoryYamlLoader<RegionData>(DIRS.REGIONS);
    const data = loader();
    const hexData = await getCollection('hexes');
    const hexDb: HexData[] = hexData.map(value => value.data);
    return data.map(region => {
      return {
        ...region,
        // hexIds: hexDb.filter(hex => hex.regionId === region.id).map(hex => hex.id)
        hexIds: ['v17']
      };
    });
  },
  schema: {
    ...RegionDataSchema,
    hexIds: z.array(reference('hexes'))
  }
});

export const collections = { hexes, regions };
