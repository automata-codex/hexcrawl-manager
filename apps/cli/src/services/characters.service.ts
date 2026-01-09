import { loadAllYamlInDir, REPO_PATHS } from '@achm/data';

import type { CharacterData } from '@achm/schemas';

export function loadAllCharacters(): CharacterData[] {
  return loadAllYamlInDir<CharacterData>(REPO_PATHS.CHARACTERS());
}
