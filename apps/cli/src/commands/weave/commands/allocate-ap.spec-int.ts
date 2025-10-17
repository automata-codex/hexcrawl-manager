// apps/cli/test/weave.allocate.ap.int.spec.ts
import { buildSessionFilename, REPO_PATHS } from '@skyreach/data';
import { makeSessionId } from '@skyreach/schemas';
import {
  runScribe,
  runWeave,
  saveCharacter,
  withTempRepo,
} from '@skyreach/test-helpers';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import yaml from 'yaml';

import { readApLedger } from '../../../services/ap-ledger.service';

// --- Mock statusAp to return available absence credits for our test character ---
vi.mock('./status-ap', async () => {
  return {
    statusAp: vi.fn(async () => ({
      apByCharacter: {},
      absenceAwards: [
        {
          characterId: 'alistar',
          displayName: 'Alistar Frankenstein',
          eligibleMissed: 3,
          claimed: 0,
          unclaimed: 3,
        },
      ],
    })),
  };
});

describe('Command `weave allocate ap` (happy path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allocates Tier-1 absence credits, prints a table, and appends to the ledger', async () => {
    await withTempRepo(
      'weave-allocate-ap-happy',
      { initGit: false },
      async (repo) => {
        saveCharacter('alistar');
        saveCharacter('daemaris');
        saveCharacter('istavan');

        const sessionId = makeSessionId(1);
        const sessionDate = '2025-09-27';

        const session1Commands = [
          'start r14',
          'party add alistar',
          'party add daemaris',
          'party add istavan',
          'day start 17 umb 1511',
          'ap combat 1',
          'ap exploration 1',
          'ap social 1',
          'rest',
          'finalize',
          'exit',
        ];
        // eslint-disable-next-line no-unused-vars
        const session1Result = await runScribe(session1Commands, {
          repo,
        });

        // console.log('STDOUT:', session1Result.stdout);
        // console.log('STDERR:', session1Result.stderr);


        const session2Commands = [
          'start r14',
          'party add daemaris',
          'party add istavan',
          'day start 18 umb 1511',
          'ap combat 1',
          'ap exploration 1',
          'ap social 1',
          'rest',
          'finalize',
          'exit',
        ];
        // eslint-disable-next-line no-unused-vars
        const session2Result = await runScribe(session2Commands, {
          repo,
        });


        // 1) Minimal finalized session so getLatestSessionNumber() resolves to 1
        // const finalizedLogPath = path.join(
        //   REPO_PATHS.SESSIONS(),
        //   buildSessionFilename(sessionId, sessionDate),
        // );
        // tiny, valid JSONL payload is fine (content not used by allocate)
        // fs.writeFileSync(finalizedLogPath, '{"kind":"day_start"}\n');

        // 2) Minimal character (Tier-1)
        // saveCharacter('alistar');
        // const charactersDir = path.join(repo, 'data', 'characters');
        // fs.mkdirSync(charactersDir, { recursive: true });
        // fs.writeFileSync(
        //   path.join(charactersDir, 'alistar.yaml'),
        //   yaml.stringify({ id: 'alistar', displayName: 'Alistar', level: 1 }),
        // );

        // 3) Ensure an empty AP ledger file exists (allocate will append)
        // const ledgerPath = REPO_PATHS.AP_LEDGER();
        // fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
        // if (!fs.existsSync(ledgerPath)) {
        //   fs.writeFileSync(ledgerPath, yaml.stringify([]));
        // }

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
            '"Missed 0021"',
          ],
          { repo },
        );

        console.log('STDOUT:', stdout);
        console.log('STDERR:', stderr);

        // 5) CLI behavior
        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        // Table output expectations:
        // characterId | amount | pillars (c/e/s) | sessionIdSpentAt | available(before→after) | note
        expect(stdout).toContain('alistar');
        expect(stdout).toMatch(/alistar.*\b3\b/);
        expect(stdout).toMatch(/1\/2\/0/);
        expect(stdout).toContain('session-0001');
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
        expect(entry.sessionId).toBe('session-0001');

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
