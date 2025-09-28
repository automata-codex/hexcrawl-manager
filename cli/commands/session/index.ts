import { pad } from '@skyreach/cli-kit';
import { loadMeta, resolveDataPath, writeYamlAtomic } from '@skyreach/data';
import { SessionReportSchema } from '@skyreach/schemas';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';


export const sessionCommand = new Command('session')
  .description('Bootstrap a new planned session report')
  .option('--force', 'Overwrite if the session file already exists')
  .action((opts) => {
    // Step 1: Read meta.yaml
    let meta;
    try {
      meta = loadMeta();
    } catch (e) {
      console.error(e);
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
    const sessionReportsDir = resolveDataPath('session-reports'); // TODO This should use REPO_PATHS
    const outPath = path.join(sessionReportsDir, `${sessionId}.yaml`);

    // Step 4: Check for Existing File
    if (fs.existsSync(outPath) && !opts.force) {
      console.error(`❌ Session report already exists at ${outPath}. Use --force to overwrite.`);
      process.exit(1);
    }

    // Step 5: Create Planned Session Report Object
    const nowIso = new Date().toISOString();
    const plannedReport = {
      id: sessionId,
      status: 'planned',
      scribeIds: [],
      sessionDate: '',
      gameStartDate: '',
      agenda: [],
      downtime: [],
      absenceAllocations: [],
      schemaVersion: 2,
      source: 'scribe',
      createdAt: nowIso,
    };

    // Step 6: Validate with Zod
    const parsed = SessionReportSchema.safeParse(plannedReport);
    if (!parsed.success) {
      console.error('❌ Session report validation failed:', parsed.error.format());
      process.exit(1);
    }

    // Step 7: Write YAML File
    writeYamlAtomic(outPath, plannedReport);

    // Step 8: Output Success Message
    console.log(`✅ Created planned session report: ${outPath}`);
  });
