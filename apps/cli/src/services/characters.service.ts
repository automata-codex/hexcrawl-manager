import { loadAllYamlInDir, REPO_PATHS } from '@skyreach/data';

import type { CharacterData } from '@skyreach/schemas';

export function loadAllCharacters(): CharacterData[] {
  return loadAllYamlInDir<CharacterData>(REPO_PATHS.CHARACTERS());
}
