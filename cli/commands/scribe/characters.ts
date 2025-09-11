import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { getRepoPath } from '../../utils/config';

let CACHED_CHAR_IDS: string[] | null = null;

export function getAllCharacterIds(): string[] {
  if (CACHED_CHAR_IDS) return CACHED_CHAR_IDS;
  CACHED_CHAR_IDS = loadCharacterIds();
  return CACHED_CHAR_IDS;
}

export function loadCharacterIds(): string[] {
  const dir = getRepoPath('data', 'characters');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => /\.ya?ml$/i.test(f));
  const ids: string[] = [];
  for (const f of files) {
    const p = path.join(dir, f);
    try {
      const doc = yaml.parse(fs.readFileSync(p, 'utf8'));
      const id = doc?.id;
      if (id && typeof id === 'string') ids.push(id);
    } catch { /* ignore */ }
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const key = id.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(id);
    }
  }
  return out.sort((a,b) => a.localeCompare(b, undefined, { sensitivity:'base' }));
}
