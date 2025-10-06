import { TrailData, TrailsFile } from '@skyreach/schemas';

import { readAndValidateYaml } from './fs-utils';
import { REPO_PATHS } from './repo-paths';

export function loadTrails(): Record<string, TrailData> {
  return readAndValidateYaml(REPO_PATHS.TRAILS(), TrailsFile);
}
