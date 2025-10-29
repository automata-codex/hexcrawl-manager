import { REPO_PATHS } from '@skyreach/data';
import { ApLedgerEntry, padSessionNum } from '@skyreach/schemas';
import {
  makeCompletedSessionReport,
  makePlannedSessionReport,
  runWeave,
  saveCharacter,
  withTempRepo,
} from '@skyreach/test-helpers';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import yaml from 'yaml';

import { readApLedger, rewriteApLedger } from '@skyreach/data';

describe('Command `weave allocate ap`', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allocates Tier-1 absence credits, prints a table, and appends to the ledger', async () => {
    await withTempRepo(
      'weave-allocate-ap-happy',
      { initGit: false },
      async (repo) => {
        // --- Character files (Tier 1 by level) ---
        saveCharacter('alistar', {
          level: 1,
          advancementPoints: { combat: 0, exploration: 0, social: 0 },
        });
        saveCharacter('daemaris', {
          level: 1,
          advancementPoints: { combat: 0, exploration: 0, social: 0 },
        });
        saveCharacter('istavan', {
          level: 1,
          advancementPoints: { combat: 0, exploration: 0, social: 0 },
        });

        // --- Session reports ---
        const sessionReports = [
          makeCompletedSessionReport({
            n: 1,
            date: '2025-09-01',
            present: ['alistar', 'daemaris', 'istavan'],
          }),
          makeCompletedSessionReport({
            n: 2,
            date: '2025-09-08',
            present: ['daemaris', 'istavan'],
          }),
          makeCompletedSessionReport({
            n: 3,
            date: '2025-09-15',
            present: ['daemaris', 'istavan'],
          }),
          makeCompletedSessionReport({
            n: 4,
            date: '2025-09-22',
            present: ['daemaris', 'istavan'],
          }),
          makeCompletedSessionReport({
            n: 5,
            date: '2025-09-29',
            present: ['alistar', 'daemaris', 'istavan'],
          }),
          makePlannedSessionReport({ n: 6 }), // should be ignored by status
        ];
        sessionReports.forEach((report, i) => {
          const filename = path.join(
            REPO_PATHS.REPORTS(),
            `session-${padSessionNum(i + 1)}.yaml`,
          );
          fs.writeFileSync(filename, yaml.stringify(report));
        });

        // --- AP Ledger ---
        const ledger: ApLedgerEntry[] = [];
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), ledger);

        // 4) Run CLI (request exactly the available 3 credits)
        const { exitCode, stdout, stderr } = await runWeave(
          [
            'allocate',
            'ap',
            '--character',
            'alistar',
            '--amount',
            '3',
            '--combat',
            '1',
            '--exploration',
            '2',
            '--note',
            'Missed 0021',
          ],
          { repo },
        );

        // 5) CLI behavior
        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        // Table output expectations:
        // characterId | amount | pillars (c/e/s) | sessionIdSpentAt | available(before→after) | note
        expect(stdout).toContain('alistar');
        expect(stdout).toMatch(/alistar.*\b3\b/);
        expect(stdout).toMatch(/1\/2\/0/);
        expect(stdout).toContain('session-0005');
        expect(stdout).toMatch(/3→0/);
        expect(stdout).toContain('Missed 0021');

        // 6) Ledger was appended with an absence_spend for alistar
        const ledgerEntries = readApLedger(REPO_PATHS.AP_LEDGER());
        // Should have exactly one new entry
        expect(Array.isArray(ledgerEntries)).toBe(true);
        expect(ledgerEntries.length).toBe(1);

        const entry = ledgerEntries[0] as any;
        expect(entry.kind).toBe('absence_spend');
        expect(entry.characterId).toBe('alistar');
        expect(entry.sessionId).toBe('session-0005');

        // Pillar deltas match the CLI split
        // Shape: advancementPoints.{combat|exploration|social}.delta
        expect(entry.advancementPoints?.combat?.delta).toBe(1);
        expect(entry.advancementPoints?.exploration?.delta).toBe(2);
        expect(entry.advancementPoints?.social?.delta).toBe(0);

        // Note and timestamp present
        expect(entry.notes).toBe('Missed 0021');
        expect(typeof entry.appliedAt).toBe('string');
        expect(entry.appliedAt.length).toBeGreaterThan(0);
      },
    );
  });
});
