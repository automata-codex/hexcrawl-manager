import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

import { getRepoPath } from '../../../lib/repo';
import { pad } from '../shared-lib';
import { REPO_PATHS } from '../shared-lib/constants';

export const sessionCommand = new Command('session')
  .description('Bootstrap a new planned session report')
  .option('--force', 'Overwrite if the session file already exists')
  .action((opts) => {
    // Step 1: Read meta.yaml
    const metaPath = REPO_PATHS.META();
    if (!fs.existsSync(metaPath)) {
      console.error(`❌ meta.yaml not found at ${metaPath}`);
      process.exit(1);
    }
    const metaRaw = fs.readFileSync(metaPath, 'utf8');
    let meta;
    try {
      meta = yaml.parse(metaRaw);
    } catch (e) {
      console.error(`❌ Failed to parse meta.yaml:`, e);
      process.exit(1);
    }
    const nextSessionSeq = meta.nextSessionSeq;
    if (typeof nextSessionSeq !== 'number' || !Number.isInteger(nextSessionSeq)) {
      console.error(`❌ Invalid or missing nextSessionSeq in meta.yaml`);
      process.exit(1);
    }

    // Step 2: Generate Session ID
    const sessionId = `session-${pad(nextSessionSeq)}`;

    // Step 3: Determine Output Path
    const sessionReportsDir = getRepoPath('data', 'session-reports');
    const outPath = path.join(sessionReportsDir, `${sessionId}.yaml`);

    // Step 4: Check for Existing File
    if (fs.existsSync(outPath) && !opts.force) {
      console.error(`❌ Session report already exists at ${outPath}. Use --force to overwrite.`);
      process.exit(1);
    }

    // Placeholder for next steps
    console.log(`[session] Would create: ${outPath} (id: ${sessionId})`);
  });
