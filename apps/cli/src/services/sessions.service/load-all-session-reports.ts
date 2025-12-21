import { loadAllYamlInDir, REPO_PATHS } from '@achm/data';

import type { SessionReport } from '@achm/schemas';

export function loadAllSessionReports(): SessionReport[] {
  return loadAllYamlInDir<SessionReport>(REPO_PATHS.REPORTS());
}
