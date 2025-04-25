import { readFile } from 'fs/promises';
import { parse } from 'yaml';
import path from 'path';
import type { ClueLink } from '../types.ts';

export async function loadClueLinks() {
  const filePath = path.resolve('./data/clue-links.yaml');
  const fileContents = await readFile(filePath, 'utf-8');
  return parse(fileContents) as ClueLink[];
}
