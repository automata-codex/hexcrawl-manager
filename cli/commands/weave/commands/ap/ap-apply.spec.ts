import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import yaml from 'yaml';
import { REPO_PATHS } from '@skyreach/data';
import { type Event, runWeave, withTempRepo } from '@skyreach/cli-kit';

const events: Event[] = [
  {
    seq: 3,
    ts: '2024-01-01T18:40:00Z',
    kind: 'day_start',
    payload: {
      calendarDate: { year: 1511, month: 'Umbraeus', day: 17 },
      season: 'autumn',
      daylightCap: 12,
    },
  },
  {
    seq: 4,
    ts: '2024-01-01T18:50:00Z',
    kind: 'party_set',
    payload: { ids: ['alistar', 'daemaris', 'istavan'] },
  },
  {
    seq: 5,
    ts: '2024-01-01T19:00:00Z',
    kind: 'advancement_point',
    payload: {
      pillar: 'combat',
      tier: 1,
      note: 'Defeated goblins',
      at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
    },
  },
  {
    seq: 18,
    ts: '2024-01-01T19:10:00Z',
    kind: 'advancement_point',
    payload: {
      pillar: 'exploration',
      tier: 2,
      note: 'Found a hidden dungeon',
      at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
    },
  },
  {
    seq: 22,
    ts: '2024-01-01T19:11:00Z',
    kind: 'advancement_point',
    payload: {
      pillar: 'social',
      tier: 1,
      note: 'Talked to the alseid',
      at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
    },
  },
  {
    seq: 27,
    ts: '2024-01-01T19:12:00Z',
    kind: 'advancement_point',
    payload: {
      pillar: 'exploration',
      tier: 1,
      note: 'Entered a new region',
      at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
    },
  },
  {
    seq: 33,
    ts: '2024-01-01T19:13:00Z',
    kind: 'advancement_point',
    payload: {
      pillar: 'combat',
      tier: 1,
      note: 'Fought some baddies',
      at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
    },
  },
  {
    seq: 37,
    ts: '2024-01-01T19:14:00Z',
    kind: 'advancement_point',
    payload: {
      pillar: 'exploration',
      tier: 1,
      note: 'Found a hidden temple',
      at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
    },
  },
  {
    seq: 42,
    ts: '2024-01-01T19:15:00Z',
    kind: 'advancement_point',
    payload: {
      pillar: 'social',
      tier: 1,
      note: 'Chatted with village elder',
      at: { hex: '0101', party: ['alistar', 'istavan', 'daemaris'] },
    },
  },
  {
    seq: 21,
    ts: '2024-01-01T19:20:00Z',
    kind: 'day_end',
    payload: { summary: { active: 13, daylight: 13, night: 0 } },
  },
];

function writeCharacterFiles() {
  fs.writeFileSync(
    path.join(REPO_PATHS.CHARACTERS(), 'alistar.yaml'),
    yaml.stringify({
      id: 'alistar',
      fullName: 'Alistar',
      displayName: 'Alistar',
      pronouns: 'he/him',
      playerId: 'peter-quinn',
      species: 'Elf',
      culture: 'Wood Elf',
      class: 'Wizard',
      level: 5,
      advancementPoints: {
        combat: 13,
        exploration: 14,
        social: 14,
      },
    }),
  );

  fs.writeFileSync(
    path.join(REPO_PATHS.CHARACTERS(), 'daemaris.yaml'),
    yaml.stringify({
      id: 'daemaris',
      fullName: 'Daemaris',
      displayName: 'Daemaris',
      pronouns: 'she/her',
      playerId: 'emilie-siciliano',
      species: 'Tiefling',
      culture: 'Bandit',
      class: 'Ranger',
      level: 5,
      advancementPoints: {
        combat: 13,
        exploration: 15,
        social: 14,
      },
    }),
  );

  fs.writeFileSync(
    path.join(REPO_PATHS.CHARACTERS(), 'istavan.yaml'),
    yaml.stringify({
      id: 'istavan',
      fullName: 'Grandfather Istavan',
      displayName: 'Istavan',
      pronouns: 'he/him',
      playerId: 'lucas-watkins',
      species: 'Human',
      culture: 'Frostfell',
      class: 'Fighter',
      level: 2,
      advancementPoints: {
        combat: 3,
        exploration: 3,
        social: 3,
      },
    }),
  );
}

describe('Command `weave ap apply`', () => {
  describe('CLI invocation', () => {
    it('applies AP for a specific session in explicit mode', async () => {
      await withTempRepo(
        'ap-apply-explicit',
        { initGit: false },
        async (repo) => {
          writeCharacterFiles();

          // Simulate finalized scribe logs for session-0001
          const logPath = path.join(
            REPO_PATHS.SESSIONS(),
            'session_0001_2025-09-25.jsonl',
          );
          fs.writeFileSync(
            logPath,
            events.map((e) => JSON.stringify(e)).join('\n'),
          );

          // Run weave ap apply explicitly for session-0001
          // eslint-disable-next-line no-unused-vars
          const { exitCode, stderr, stdout } = await runWeave(
            ['ap', 'apply', 'session-0001'],
            { repo },
          );

          expect(exitCode).toBe(0);
          expect(stderr).toBeFalsy();

          // Verify session report output
          const reportPath = path.join(
            REPO_PATHS.REPORTS(),
            'session-0001.yaml',
          );
          expect(fs.existsSync(reportPath)).toBe(true);
          const report = yaml.parse(fs.readFileSync(reportPath, 'utf8'));
          expect(report.characterIds).toEqual([
            'alistar',
            'daemaris',
            'istavan',
          ]);
          expect(report.advancementPoints).toEqual({
            combat: {
              number: 1,
              maxTier: 1,
            },
            exploration: {
              number: 1,
              maxTier: 2,
            },
            social: {
              number: 1,
              maxTier: 1,
            },
          });

          // Verify AP ledger output
          const ledgerPath = path.join(repo, 'data', 'ap-ledger.yaml');
          expect(fs.existsSync(ledgerPath)).toBe(true);
          const ledger = yaml.parse(fs.readFileSync(ledgerPath, 'utf8'));

          // Find entries for session-0001 and check AP values
          const alistarEntry = ledger.find(
            (e: any) =>
              e.sessionId === 'session-0001' && e.characterId === 'alistar',
          );
          const daemarisEntry = ledger.find(
            (e: any) =>
              e.sessionId === 'session-0001' && e.characterId === 'daemaris',
          );
          const istavanEntry = ledger.find(
            (e: any) =>
              e.sessionId === 'session-0001' && e.characterId === 'istavan',
          );
          expect(alistarEntry).toBeDefined();
          expect(alistarEntry.advancementPoints.combat).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });
          expect(alistarEntry.advancementPoints.exploration).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(alistarEntry.advancementPoints.social).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });

          expect(daemarisEntry).toBeDefined();
          expect(daemarisEntry.advancementPoints.combat).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });
          expect(daemarisEntry.advancementPoints.exploration).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(daemarisEntry.advancementPoints.social).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });

          expect(istavanEntry).toBeDefined();
          expect(istavanEntry.advancementPoints.combat).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(istavanEntry.advancementPoints.exploration).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(istavanEntry.advancementPoints.social).toEqual({
            delta: 1,
            reason: 'normal',
          });
        },
      );
    });

    it('auto-selects the next pending session in Option R mode', async () => {
      await withTempRepo(
        'ap-apply-auto-mode',
        { initGit: false },
        async (repo) => {
          writeCharacterFiles();

          // Simulate finalized scribe logs for two sessions: session-0001 and session-0002
          // session-0001 (already completed)
          const logPath1 = path.join(
            REPO_PATHS.SESSIONS(),
            'session_0001_2025-09-25.jsonl',
          );
          fs.writeFileSync(
            logPath1,
            events.map((e) => JSON.stringify(e)).join('\n'),
          );
          // session-0002 (pending)
          const logPath2 = path.join(
            REPO_PATHS.SESSIONS(),
            'session_0002_2025-09-26.jsonl',
          );
          fs.writeFileSync(
            logPath2,
            events.map((e) => JSON.stringify(e)).join('\n'),
          );

          // Simulate completed report for session-0001
          const reportPath1 = path.join(
            REPO_PATHS.REPORTS(),
            'session-0001.yaml',
          );
          fs.writeFileSync(
            reportPath1,
            yaml.stringify({
              characterIds: ['alistar', 'daemaris', 'istavan'],
              status: 'completed',
              fingerprint: 'existing-fingerprint',
              sessionId: 'session-0001',
              advancementPoints: [
                { pillar: 'exploration', number: 2, maxTier: 1 },
              ],
            }),
          );

          // Run weave ap apply in auto-mode (Option R)
          // eslint-disable-next-line no-unused-vars
          const { exitCode, stderr, stdout } = await runWeave(
            ['ap', 'apply'],
            { repo },
          );

          expect(exitCode).toBe(0);
          expect(stderr).toBeFalsy();

          // Verify session report output for session-0002
          const reportPath2 = path.join(
            REPO_PATHS.REPORTS(),
            'session-0002.yaml',
          );
          expect(fs.existsSync(reportPath2)).toBe(true);
          const report2 = yaml.parse(fs.readFileSync(reportPath2, 'utf8'));
          expect(report2.characterIds).toEqual([
            'alistar',
            'daemaris',
            'istavan',
          ]);

          // Verify AP ledger output for session-0002
          const ledgerPath = path.join(repo, 'data', 'ap-ledger.yaml');
          expect(fs.existsSync(ledgerPath)).toBe(true);
          const ledger = yaml.parse(fs.readFileSync(ledgerPath, 'utf8'));

          const alistarEntry = ledger.find(
            (e: any) =>
              e.sessionId === 'session-0002' && e.characterId === 'alistar',
          );
          expect(alistarEntry).toBeDefined();
          expect(alistarEntry.advancementPoints.combat).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });
          expect(alistarEntry.advancementPoints.exploration).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(alistarEntry.advancementPoints.social).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });

          const daemarisEntry = ledger.find(
            (e: any) =>
              e.sessionId === 'session-0002' && e.characterId === 'daemaris',
          );
          expect(daemarisEntry).toBeDefined();
          expect(daemarisEntry.advancementPoints.combat).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });
          expect(daemarisEntry.advancementPoints.exploration).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(daemarisEntry.advancementPoints.social).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });

          const istavanEntry = ledger.find(
            (e: any) =>
              e.sessionId === 'session-0002' && e.characterId === 'istavan',
          );
          expect(istavanEntry).toBeDefined();
          expect(istavanEntry.advancementPoints.combat).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(istavanEntry.advancementPoints.exploration).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(istavanEntry.advancementPoints.social).toEqual({
            delta: 1,
            reason: 'normal',
          });
        },
      );
    });

    it('fails with a clear message if no pending sessions are found in "Option R" mode', async () => {
      await withTempRepo(
        'ap-apply-no-pending',
        { initGit: false },
        async (repo) => {
          writeCharacterFiles();

          // Simulate finalized scribe logs for session-0001 (already completed)
          const logPath = path.join(
            REPO_PATHS.SESSIONS(),
            'session_0001_2025-09-25.jsonl',
          );
          fs.writeFileSync(
            logPath,
            events.map((e) => JSON.stringify(e)).join('\n'),
          );

          // Simulate completed report for session-0001
          const reportsDir = REPO_PATHS.REPORTS();
          const reportPath = path.join(reportsDir, 'session-0001.yaml');
          fs.writeFileSync(
            reportPath,
            yaml.stringify({
              characterIds: ['alistar', 'daemaris', 'istavan'],
              sessionId: 'session-0001',
              advancementPoints: {
                combat: { number: 1, maxTier: 1 },
                exploration: { number: 1, maxTier: 2 },
                social: { number: 1, maxTier: 1 },
              },
            }),
          );

          // Run weave ap apply in auto-mode (Option R) with no pending sessions
          const { exitCode, stderr, stdout } = await runWeave(
            ['ap', 'apply'],
            { repo },
          );

          // Should fail (non-zero exit code) and print a clear message
          expect(exitCode).not.toBe(0);
          expect(stderr || stdout).toMatch(/no pending sessions/i);
        },
      );
    });
  });

  describe('Session resolution', () => {
    it.todo('finds completed session reports and finalized logs');
    it.todo('validates that explicit session has finalized logs, else fails');
  });

  describe('Scribe part discovery', () => {
    it.todo('globs and sorts all scribe log parts for the chosen session');
    it.todo('computes fingerprint from sorted scribe log basenames');
  });

  describe('Preflight guards', () => {
    it.todo('no-ops if a completed report exists with matching fingerprint');
    it.todo('fails if a completed report exists with mismatched fingerprint');
    it.todo('fails if planned report exists and git status is dirty');
    it.todo(
      'fails if character IDs in logs do not resolve to known character files',
    );
  });

  describe('Parsing logs and deriving session data', () => {
    it.todo('parses all JSONL log parts in sorted order');
    it.todo('derives attendance.characterIds from participation events');
    it.todo('collects guests from non-character participants');
    it.todo('collects AP events per character and pillar');
    it.todo('extracts in-world gameStartDate and gameEndDate if present');
  });

  describe('Idempotency', () => {
    it('is idempotent: repeat runs with same fingerprint make no changes', async () => {
      await withTempRepo(
        'ap-apply-idempotent',
        { initGit: false },
        async (repo) => {
          writeCharacterFiles();

          // Simulate finalized scribe logs for session-0001
          const logPath = path.join(
            REPO_PATHS.SESSIONS(),
            'session_0001_2025-09-25.jsonl',
          );
          fs.writeFileSync(
            logPath,
            events.map((e) => JSON.stringify(e)).join('\n'),
          );

          // First run: apply AP for session-0001
          const resultFirst = await runWeave(
            ['ap', 'apply', 'session-0001'],
            { repo },
          );
          console.log('STDERR1:', resultFirst.stderr);
          console.log('STDOUT1:', resultFirst.stdout);
          expect(resultFirst.exitCode).toBe(0);
          expect(resultFirst.stderr).toBeFalsy();

          // Capture outputs after first run
          const reportPath = path.join(
            REPO_PATHS.REPORTS(),
            'session-0001.yaml',
          );
          const ledgerPath = path.join(repo, 'data', 'ap-ledger.yaml');
          expect(fs.existsSync(reportPath)).toBe(true);
          expect(fs.existsSync(ledgerPath)).toBe(true);
          const reportFirst = fs.readFileSync(reportPath, 'utf8');
          const ledgerFirst = fs.readFileSync(ledgerPath, 'utf8');

          // Second run: re-apply AP for session-0001 (should be a no-op)
          const resultSecond = await runWeave(
            ['ap', 'apply', 'session-0001'],
            { repo },
          );
          console.log('STDERR2:', resultSecond.stderr);
          console.log('STDOUT2:', resultSecond.stdout);
          expect(resultSecond.exitCode).toBe(0);
          expect(resultSecond.stderr).toBeFalsy();
          expect(resultSecond.stdout).toMatch(/no-op/i);

          // Capture outputs after second run
          const reportSecond = fs.readFileSync(reportPath, 'utf8');
          const ledgerSecond = fs.readFileSync(ledgerPath, 'utf8');

          // Assert that outputs are unchanged (idempotency)
          expect(reportSecond).toEqual(reportFirst);
          expect(ledgerSecond).toEqual(ledgerFirst);
        },
      );
    });
  });

  describe('Error handling', () => {
    it.todo(
      'fails with clear message if no finalized logs are found for explicit session',
    );
    it.todo('fails with specific IDs/paths for unknown character IDs');
    it.todo('prints guidance for immutable mismatch errors');
  });
});
