import { loadAllYamlInDir, REPO_PATHS } from '@skyreach/data';

import type { SessionReport } from '@skyreach/schemas';

export function loadAllSessionReports(): SessionReport[] {
  return loadAllYamlInDir<SessionReport>(REPO_PATHS.REPORTS());
}
