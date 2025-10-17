import { REPO_PATHS } from '@skyreach/data';
import { CharacterSchema, type CharacterData } from '@skyreach/schemas';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

export type CharacterKey = 'alistar' | 'daemaris' | 'istavan';

const PRESETS: Record<CharacterKey, CharacterData> = {
  alistar: {
    id: 'alistar',
    fullName: 'Alistar',
    displayName: 'Alistar',
    pronouns: 'he/him',
    playerId: 'peter-quinn',
    species: 'Elf',
    culture: 'Wood Elf',
    class: 'Wizard',
    level: 5,
    advancementPoints: { combat: 13, exploration: 14, social: 14 },
  },
  daemaris: {
    id: 'daemaris',
    fullName: 'Daemaris',
    displayName: 'Daemaris',
    pronouns: 'she/her',
    playerId: 'emilie-siciliano',
    species: 'Tiefling',
    culture: 'Bandit',
    class: 'Ranger',
    level: 5,
    advancementPoints: {
      combat: 13,
      exploration: 15,
      social: 14,
    },
  },
  istavan: {
    id: 'istavan',
    fullName: 'Grandfather Istavan',
    displayName: 'Istavan',
    pronouns: 'he/him',
    playerId: 'lucas-watkins',
    species: 'Human',
    culture: 'Frostfell',
    class: 'Fighter',
    level: 2,
    advancementPoints: {
      combat: 3,
      exploration: 3,
      social: 3,
    },
  },
};

// shallow merge by default; replace nested objects wholesale if provided in overrides
function mergeCharacter(
  base: CharacterData,
  overrides?: Partial<CharacterData>,
): CharacterData {
  return overrides ? ({ ...base, ...overrides } as CharacterData) : base;
}

export function saveCharacter(
  key: CharacterKey,
  overrides?: Partial<CharacterData>,
  { validate = true }: { validate?: boolean } = {},
) {
  const base = PRESETS[key];
  if (!base) throw new Error(`Unknown character key: ${key}`);

  const candidate = mergeCharacter(base, overrides);
  const data = validate ? CharacterSchema.parse(candidate) : candidate;

  const dir = REPO_PATHS.CHARACTERS();
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${data.id}.yaml`);
  fs.writeFileSync(filePath, yaml.stringify(data), 'utf-8');

  return { id: data.id, filePath, data };
}

export function saveCharacters(
  specs: Array<{ key: CharacterKey; overrides?: Partial<CharacterData> }>,
  opts?: { validate?: boolean },
) {
  return specs.map(({ key, overrides }) => saveCharacter(key, overrides, opts));
}
