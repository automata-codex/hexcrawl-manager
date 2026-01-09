import { REPO_PATHS } from '@achm/data';
import { readApLedger, rewriteApLedger } from '@achm/data';
import { ApLedgerEntry, padSessionNum } from '@achm/schemas';
import {
  makeCompletedSessionReport,
  runWeave,
  saveCharacter,
  withTempRepo,
} from '@achm/test-helpers';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import yaml from 'yaml';

describe('Command `weave allocate ap milestone`', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allocates milestone AP, prints a table, and appends to the ledger', async () => {
    await withTempRepo(
      'weave-allocate-ap-milestone-happy',
      { initGit: false },
      async (repo) => {
        // --- Character files ---
        saveCharacter('alistar', {
          level: 1,
          advancementPoints: { combat: 0, exploration: 0, social: 0 },
        });

        // --- Session reports (need at least one completed session) ---
        const sessionReports = [
          makeCompletedSessionReport({
            n: 1,
            date: '2025-09-01',
            present: ['alistar'],
          }),
        ];
        sessionReports.forEach((report, i) => {
          const filename = path.join(
            REPO_PATHS.REPORTS(),
            `session-${padSessionNum(i + 1)}.yaml`,
          );
          fs.writeFileSync(filename, yaml.stringify(report));
        });

        // --- Empty AP Ledger ---
        const ledger: ApLedgerEntry[] = [];
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), ledger);

        // Run CLI
        const { exitCode, stdout, stderr } = await runWeave(
          [
            'allocate',
            'ap',
            'milestone',
            '--character',
            'alistar',
            '--combat',
            '1',
            '--exploration',
            '1',
            '--social',
            '1',
            '--note',
            'Winter survival',
          ],
          { repo },
        );

        // CLI behavior
        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        // Table output expectations
        expect(stdout).toContain('alistar');
        expect(stdout).toMatch(/alistar.*\b3\b/); // amount is always 3
        expect(stdout).toMatch(/1\/1\/1/); // pillar splits
        expect(stdout).toContain('session-0001');
        expect(stdout).toContain('Winter survival');

        // Ledger was appended with a milestone_spend entry
        const ledgerEntries = readApLedger(REPO_PATHS.AP_LEDGER());
        expect(Array.isArray(ledgerEntries)).toBe(true);
        expect(ledgerEntries.length).toBe(1);

        const entry = ledgerEntries[0] as any;
        expect(entry.kind).toBe('milestone_spend');
        expect(entry.characterId).toBe('alistar');
        expect(entry.sessionId).toBe('session-0001');

        // Pillar deltas match the CLI split
        expect(entry.advancementPoints?.combat?.delta).toBe(1);
        expect(entry.advancementPoints?.exploration?.delta).toBe(1);
        expect(entry.advancementPoints?.social?.delta).toBe(1);

        // Note and timestamp present
        expect(entry.notes).toBe('Winter survival');
        expect(typeof entry.appliedAt).toBe('string');
        expect(entry.appliedAt.length).toBeGreaterThan(0);
      },
    );
  });

  it('allocates milestone AP to multiple characters', async () => {
    await withTempRepo(
      'weave-allocate-ap-milestone-multi',
      { initGit: false },
      async (repo) => {
        // --- Character files ---
        saveCharacter('alistar', {
          level: 1,
          advancementPoints: { combat: 0, exploration: 0, social: 0 },
        });
        saveCharacter('daemaris', {
          level: 1,
          advancementPoints: { combat: 0, exploration: 0, social: 0 },
        });

        // --- Session reports ---
        const sessionReports = [
          makeCompletedSessionReport({
            n: 1,
            date: '2025-09-01',
            present: ['alistar', 'daemaris'],
          }),
        ];
        sessionReports.forEach((report, i) => {
          const filename = path.join(
            REPO_PATHS.REPORTS(),
            `session-${padSessionNum(i + 1)}.yaml`,
          );
          fs.writeFileSync(filename, yaml.stringify(report));
        });

        // --- Empty AP Ledger ---
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), []);

        // Run CLI with multiple characters
        const { exitCode, stdout, stderr } = await runWeave(
          [
            'allocate',
            'ap',
            'milestone',
            '--character',
            'alistar',
            '--combat',
            '2',
            '--exploration',
            '1',
            '--social',
            '0',
            '--note',
            'Dragon quest',
            '--character',
            'daemaris',
            '--combat',
            '0',
            '--exploration',
            '1',
            '--social',
            '2',
          ],
          { repo },
        );

        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        // Both characters in output
        expect(stdout).toContain('alistar');
        expect(stdout).toContain('daemaris');

        // Ledger has two entries
        const ledgerEntries = readApLedger(REPO_PATHS.AP_LEDGER());
        expect(ledgerEntries.length).toBe(2);

        const alistarEntry = ledgerEntries.find(
          (e: any) => e.characterId === 'alistar',
        ) as any;
        const daemarisEntry = ledgerEntries.find(
          (e: any) => e.characterId === 'daemaris',
        ) as any;

        expect(alistarEntry.kind).toBe('milestone_spend');
        expect(alistarEntry.advancementPoints?.combat?.delta).toBe(2);
        expect(alistarEntry.advancementPoints?.exploration?.delta).toBe(1);
        expect(alistarEntry.advancementPoints?.social?.delta).toBe(0);
        expect(alistarEntry.notes).toBe('Dragon quest');

        expect(daemarisEntry.kind).toBe('milestone_spend');
        expect(daemarisEntry.advancementPoints?.combat?.delta).toBe(0);
        expect(daemarisEntry.advancementPoints?.exploration?.delta).toBe(1);
        expect(daemarisEntry.advancementPoints?.social?.delta).toBe(2);
      },
    );
  });

  it('dry-run does not modify the ledger', async () => {
    await withTempRepo(
      'weave-allocate-ap-milestone-dryrun',
      { initGit: false },
      async (repo) => {
        saveCharacter('alistar', {
          level: 1,
          advancementPoints: { combat: 0, exploration: 0, social: 0 },
        });

        const sessionReports = [
          makeCompletedSessionReport({
            n: 1,
            date: '2025-09-01',
            present: ['alistar'],
          }),
        ];
        sessionReports.forEach((report, i) => {
          const filename = path.join(
            REPO_PATHS.REPORTS(),
            `session-${padSessionNum(i + 1)}.yaml`,
          );
          fs.writeFileSync(filename, yaml.stringify(report));
        });

        rewriteApLedger(REPO_PATHS.AP_LEDGER(), []);

        const { exitCode, stdout } = await runWeave(
          [
            'allocate',
            'ap',
            'milestone',
            '--character',
            'alistar',
            '--combat',
            '1',
            '--exploration',
            '1',
            '--social',
            '1',
            '--dry-run',
          ],
          { repo },
        );

        expect(exitCode).toBe(0);
        expect(stdout).toContain('[DRY RUN]');

        // Ledger should still be empty
        const ledgerEntries = readApLedger(REPO_PATHS.AP_LEDGER());
        expect(ledgerEntries.length).toBe(0);
      },
    );
  });
});
