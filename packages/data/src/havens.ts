import { z } from 'zod';

import { readAndValidateYaml } from './fs-utils.js';
import { REPO_PATHS } from './repo-paths.js';

export function loadHavens(): string[] {
  return readAndValidateYaml(REPO_PATHS.HAVENS(), z.array(z.string()));
}
