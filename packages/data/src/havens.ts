import { z } from 'zod';

import { readAndValidateYaml } from './fs-utils';
import { REPO_PATHS } from './repo-paths';

export function loadHavens(): string[] {
  return readAndValidateYaml(REPO_PATHS.HAVENS(), z.array(z.string()));
}
