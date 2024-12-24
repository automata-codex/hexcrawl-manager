// 1. Import utilities from `astro:content`
import { defineCollection, z } from 'astro:content';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import type { HexDatabase } from './types.ts';

// 2. Import loader(s)
// import { glob, file } from 'astro/loaders';

// 3. Define your collection(s)
const hexes = defineCollection({
  loader: (): HexDatabase => {
    const DIRECTORY = path.join(process.cwd(), 'data');
    const files = fs.readdirSync(DIRECTORY);
    const data = files.map(file => {
      const filePath = path.join(DIRECTORY, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      return yaml.parse(fileContents);
    });
    return data.flat();
  },
});

// 4. Export a single `collections` object to register your collection(s)
export const collections = { hexes };
