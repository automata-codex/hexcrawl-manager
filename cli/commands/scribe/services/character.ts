import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

import { REPO_PATHS } from '@skyreach/data';

export function loadCharacterIds(): string[] {
  const files = fs
    .readdirSync(REPO_PATHS.CHARACTERS())
    .filter((f) => /\.ya?ml$/i.test(f));
  const ids: string[] = [];
  for (const f of files) {
    const p = path.join(REPO_PATHS.CHARACTERS(), f);
    try {
      const doc = yaml.parse(fs.readFileSync(p, 'utf8'));
      const id = doc?.id;
      if (id && typeof id === 'string') {
        ids.push(id);
      }
    } catch {
      /* ignore */
    }
  }
  const seen = new Set<string>(),
    out: string[] = [];
  for (const id of ids) {
    const k = id.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(id);
    }
  }
  return out.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
}

let memo: string[] | null = null;

export function getAllCharacterIds(): string[] {
  if (memo) return memo;
  memo = loadCharacterIds();
  return memo;
}

export function reloadCharacterIds(): string[] {
  memo = loadCharacterIds();
  return memo;
}
