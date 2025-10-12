import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

import { REPORT_FILE_RE } from './regex';
import { REPO_PATHS } from './repo-paths';

export function discoverCompletedReports(): number[] {
  const dir = REPO_PATHS.REPORTS();
  if (!fs.existsSync(dir)) return [];

  const reportFiles = fs.readdirSync(dir).filter((f) => REPORT_FILE_RE.test(f));

  const completed: number[] = [];
  for (const filename of reportFiles) {
    const match = filename.match(REPORT_FILE_RE);
    if (!match) continue;

    const fullPath = path.join(dir, filename);
    try {
      const text = fs.readFileSync(fullPath, 'utf8');
      const doc = yaml.parse(text) as { status?: string };
      if (doc?.status === 'completed') {
        completed.push(parseInt(match[1], 10));
      }
    } catch {
      // ignore unreadable/invalid files; you can log if helpful
      continue;
    }
  }

  // keep a consistent order (optional)
  completed.sort((a, b) => a - b);
  return completed;
}
