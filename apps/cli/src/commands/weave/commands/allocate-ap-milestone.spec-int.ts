import { REPO_PATHS } from '@achm/data';
import {
  readApLedger,
  rewriteApLedger,
} from '@achm/data';
import {
  ApLedgerEntry,
  SessionReport,
  SessionReportSchema,
  makeSessionId,
  padSessionNum,
} from '@achm/schemas';
import {
  makeCompletedSessionReport,
  makePlannedSessionReport,
  runWeave,
  saveCharacter,
  withTempRepo,
} from '@achm/test-helpers';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import yaml from 'yaml';

function reportPathFor(n: number) {
  return path.join(
    REPO_PATHS.REPORTS(),
    `session-${padSessionNum(n)}.yaml`,
  );
}

function readReport(n: number): SessionReport {
  const raw = fs.readFileSync(reportPathFor(n), 'utf8');
  return SessionReportSchema.parse(yaml.parse(raw));
}

describe('Command `weave allocate ap milestone`', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stages an allocation in the session report (deferred topup; no ledger write)', async () => {
    await withTempRepo(
      'weave-allocate-ap-milestone-deferred',
      { initGit: false },
      async (repo) => {
        saveCharacter('alistar', { level: 1 });

        // Planned report; no session_ap in the ledger yet
        const planned = makePlannedSessionReport({ n: 1 });
        fs.writeFileSync(reportPathFor(1), yaml.stringify(planned));
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), []);

        const { exitCode, stdout, stderr } = await runWeave(
          [
            'allocate',
            'ap',
            'milestone',
            '--character',
            'alistar',
            '--session-id',
            'session-0001',
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

        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        // Output reflects deferred topup
        expect(stdout).toContain('alistar');
        expect(stdout).toContain('session-0001');
        expect(stdout).toMatch(/1\/1\/1/);
        expect(stdout).toMatch(/deferred/);

        // Report has the staged allocation
        const after = readReport(1);
        expect(after.milestoneAllocations).toHaveLength(1);
        const alloc = after.milestoneAllocations[0];
        expect(alloc.characterId).toBe('alistar');
        expect(alloc.pillarSplits).toEqual({
          combat: 1,
          exploration: 1,
          social: 1,
        });
        expect(alloc.note).toBe('Winter survival');
        expect(typeof alloc.allocatedAt).toBe('string');

        // Ledger was NOT touched
        expect(readApLedger(REPO_PATHS.AP_LEDGER())).toHaveLength(0);
      },
    );
  });

  it('eager-validates against existing pillar AP and accepts the matching topup', async () => {
    await withTempRepo(
      'weave-allocate-ap-milestone-eager-pass',
      { initGit: false },
      async (repo) => {
        saveCharacter('alistar', { level: 1 });

        const completed = makeCompletedSessionReport({
          n: 1,
          date: '2025-09-01',
          present: ['alistar'],
        });
        fs.writeFileSync(reportPathFor(1), yaml.stringify(completed));

        // Pillar AP for alistar / session-0001 sums to 2 → topup = 1
        const ledger: ApLedgerEntry[] = [
          {
            kind: 'session_ap',
            advancementPoints: {
              combat: { delta: 1, reason: 'normal' },
              exploration: { delta: 1, reason: 'normal' },
              social: { delta: 0, reason: 'normal' },
            },
            appliedAt: '2025-09-01T12:00:00.000Z',
            characterId: 'alistar',
            sessionId: makeSessionId(1),
          },
        ];
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), ledger);

        const { exitCode, stdout } = await runWeave(
          [
            'allocate',
            'ap',
            'milestone',
            '--character',
            'alistar',
            '--session-id',
            'session-0001',
            '--combat',
            '1',
            '--exploration',
            '0',
            '--social',
            '0',
          ],
          { repo },
        );

        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/topup/);
        expect(stdout).toMatch(/\b1\b/);

        const after = readReport(1);
        expect(after.milestoneAllocations).toHaveLength(1);
        expect(after.milestoneAllocations[0].pillarSplits).toEqual({
          combat: 1,
          exploration: 0,
          social: 0,
        });

        // Ledger unchanged (only the original session_ap entry)
        expect(readApLedger(REPO_PATHS.AP_LEDGER())).toHaveLength(1);
      },
    );
  });

  it('errors when staged split does not match the eager topup', async () => {
    await withTempRepo(
      'weave-allocate-ap-milestone-eager-fail',
      { initGit: false },
      async (repo) => {
        saveCharacter('alistar', { level: 1 });

        const completed = makeCompletedSessionReport({
          n: 1,
          date: '2025-09-01',
          present: ['alistar'],
        });
        fs.writeFileSync(reportPathFor(1), yaml.stringify(completed));

        // Pillar AP totals 2 → topup = 1; user provides 3 → reject
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), [
          {
            kind: 'session_ap',
            advancementPoints: {
              combat: { delta: 1, reason: 'normal' },
              exploration: { delta: 1, reason: 'normal' },
              social: { delta: 0, reason: 'normal' },
            },
            appliedAt: '2025-09-01T12:00:00.000Z',
            characterId: 'alistar',
            sessionId: makeSessionId(1),
          },
        ]);

        const { exitCode, stderr } = await runWeave(
          [
            'allocate',
            'ap',
            'milestone',
            '--character',
            'alistar',
            '--session-id',
            'session-0001',
            '--combat',
            '1',
            '--exploration',
            '1',
            '--social',
            '1',
          ],
          { repo },
        );

        expect(exitCode).not.toBe(0);
        expect(stderr).toMatch(/must sum to 1/);

        // Report is untouched
        const after = readReport(1);
        expect(after.milestoneAllocations).toHaveLength(0);
      },
    );
  });

  it('accepts a zero-sum split when grandfathered pillar AP already exceeds the cap', async () => {
    await withTempRepo(
      'weave-allocate-ap-milestone-grandfather-zero',
      { initGit: false },
      async (repo) => {
        saveCharacter('alistar', { level: 1 });

        const completed = makeCompletedSessionReport({
          n: 1,
          date: '2025-09-01',
          present: ['alistar'],
        });
        fs.writeFileSync(reportPathFor(1), yaml.stringify(completed));

        // Grandfathered pillarTotal = 4 → topup = 0
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), [
          {
            kind: 'session_ap',
            advancementPoints: {
              combat: { delta: 2, reason: 'grandfathered' },
              exploration: { delta: 1, reason: 'grandfathered' },
              social: { delta: 1, reason: 'grandfathered' },
            },
            appliedAt: '2025-09-01T12:00:00.000Z',
            characterId: 'alistar',
            sessionId: makeSessionId(1),
          },
        ]);

        const { exitCode } = await runWeave(
          [
            'allocate',
            'ap',
            'milestone',
            '--character',
            'alistar',
            '--session-id',
            'session-0001',
            '--combat',
            '0',
            '--exploration',
            '0',
            '--social',
            '0',
          ],
          { repo },
        );

        expect(exitCode).toBe(0);

        const after = readReport(1);
        expect(after.milestoneAllocations).toHaveLength(1);
        expect(after.milestoneAllocations[0].pillarSplits).toEqual({
          combat: 0,
          exploration: 0,
          social: 0,
        });
      },
    );
  });

  it('errors on duplicate allocation for (character, session)', async () => {
    await withTempRepo(
      'weave-allocate-ap-milestone-dedup',
      { initGit: false },
      async (repo) => {
        saveCharacter('alistar', { level: 1 });

        const planned = makePlannedSessionReport({ n: 1 });
        fs.writeFileSync(reportPathFor(1), yaml.stringify(planned));
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), []);

        // First allocation: success
        const first = await runWeave(
          [
            'allocate',
            'ap',
            'milestone',
            '--character',
            'alistar',
            '--session-id',
            'session-0001',
            '--combat',
            '1',
            '--exploration',
            '1',
            '--social',
            '1',
          ],
          { repo },
        );
        expect(first.exitCode).toBe(0);

        // Second allocation for same (character, session): error
        const second = await runWeave(
          [
            'allocate',
            'ap',
            'milestone',
            '--character',
            'alistar',
            '--session-id',
            'session-0001',
            '--combat',
            '0',
            '--exploration',
            '0',
            '--social',
            '0',
          ],
          { repo },
        );
        expect(second.exitCode).not.toBe(0);
        expect(second.stderr).toMatch(/already exists/i);

        const after = readReport(1);
        expect(after.milestoneAllocations).toHaveLength(1);
      },
    );
  });

  it('stages allocations for multiple characters in one invocation', async () => {
    await withTempRepo(
      'weave-allocate-ap-milestone-multi',
      { initGit: false },
      async (repo) => {
        saveCharacter('alistar', { level: 1 });
        saveCharacter('daemaris', { level: 1 });

        const planned = makePlannedSessionReport({ n: 1 });
        fs.writeFileSync(reportPathFor(1), yaml.stringify(planned));
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), []);

        const { exitCode } = await runWeave(
          [
            'allocate',
            'ap',
            'milestone',
            '--character',
            'alistar',
            '--session-id',
            'session-0001',
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
            '--session-id',
            'session-0001',
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

        const after = readReport(1);
        expect(after.milestoneAllocations).toHaveLength(2);
        const byChar = Object.fromEntries(
          after.milestoneAllocations.map((a) => [a.characterId, a]),
        );
        expect(byChar.alistar.pillarSplits).toEqual({
          combat: 2,
          exploration: 1,
          social: 0,
        });
        expect(byChar.daemaris.pillarSplits).toEqual({
          combat: 0,
          exploration: 1,
          social: 2,
        });
      },
    );
  });

  it('dry-run does not modify the session report', async () => {
    await withTempRepo(
      'weave-allocate-ap-milestone-dryrun',
      { initGit: false },
      async (repo) => {
        saveCharacter('alistar', { level: 1 });

        const planned = makePlannedSessionReport({ n: 1 });
        fs.writeFileSync(reportPathFor(1), yaml.stringify(planned));
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), []);

        const { exitCode, stdout } = await runWeave(
          [
            'allocate',
            'ap',
            'milestone',
            '--character',
            'alistar',
            '--session-id',
            'session-0001',
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

        const after = readReport(1);
        expect(after.milestoneAllocations).toHaveLength(0);
      },
    );
  });

  it('errors when the session report does not exist', async () => {
    await withTempRepo(
      'weave-allocate-ap-milestone-no-report',
      { initGit: false },
      async (repo) => {
        saveCharacter('alistar', { level: 1 });
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), []);

        const { exitCode, stderr } = await runWeave(
          [
            'allocate',
            'ap',
            'milestone',
            '--character',
            'alistar',
            '--session-id',
            'session-0099',
            '--combat',
            '1',
            '--exploration',
            '1',
            '--social',
            '1',
          ],
          { repo },
        );

        expect(exitCode).not.toBe(0);
        expect(stderr).toMatch(/Session report not found/i);
      },
    );
  });
});
