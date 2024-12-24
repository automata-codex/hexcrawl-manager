import { defineCollection, z } from 'astro:content';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { HexDataSchema } from '../schemas/hex-database';
import type { HexData } from './types.ts';

const DATA_DIR = 'data';

const DIRS = {
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
  }
}

const hexes = defineCollection({
  loader: getDirectoryYamlLoader<HexData>(DIRS.HEXES),
  schema: {
    ...HexDataSchema,
  }
});

export const collections = { hexes };
