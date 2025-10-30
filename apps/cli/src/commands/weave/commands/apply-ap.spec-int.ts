import { buildSessionFilename, REPO_PATHS } from '@skyreach/data';
import { readApLedger } from '@skyreach/data';
import {
  makeSessionId,
  type ScribeEvent,
  type SessionReport,
} from '@skyreach/schemas';
import {
  ap,
  dayEnd,
  dayStart,
  compileLog,
  guest,
  partySet,
  runWeave,
  saveCharacters,
  sessionEnd,
  sessionStart,
  withTempRepo,
} from '@skyreach/test-helpers';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import yaml from 'yaml';

const party = ['alistar', 'daemaris', 'istavan'];

function buildSessionEvents(
  sessionId: string,
  sessionDate: string,
): ScribeEvent[] {
  return compileLog([
    sessionStart(sessionId, 'R14', sessionDate),
    dayStart({ year: 1511, month: 'Umbraeus', day: 17 }),
    partySet(party),
    ap('combat', 1, party, 'A1', 'Defeated goblins'),
    ap('exploration', 2, party, 'B1', 'Found a hidden dungeon'),
    ap('social', 1, party, 'C1', 'Talked to the alseid'),
    ap('exploration', 1, party, 'D1', 'Entered a new region'),
    ap('combat', 1, party, 'E1', 'Fought some baddies'),
    ap('exploration', 1, party, 'F1', 'Found a hidden temple'),
    ap('social', 1, party, 'G1', 'Chatted with village elder'),
    dayEnd(13, 13),
    sessionEnd(sessionId),
  ]);
}

function writeCharacterFiles() {
  saveCharacters([{ key: 'alistar' }, { key: 'daemaris' }, { key: 'istavan' }]);
}

describe('Command `weave apply ap`', () => {
  describe('CLI invocation', () => {
    it('applies AP for a specific session in explicit mode', async () => {
      await withTempRepo(
        'apply-ap-explicit',
        { initGit: false },
        async (repo) => {
          writeCharacterFiles();

          // Simulate finalized scribe logs for session-0001
          const logPath = path.join(
            REPO_PATHS.SESSIONS(),
            buildSessionFilename(1, '2025-09-25'),
          );
          const events = buildSessionEvents('session-0001', '2025-09-25');
          fs.writeFileSync(
            logPath,
            events.map((e) => JSON.stringify(e)).join('\n'),
          );

          // Run weave ap apply explicitly for session-0001
          // eslint-disable-next-line no-unused-vars
          const { exitCode, stderr, stdout } = await runWeave(
            ['apply', 'ap', 'session-0001'],
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
          expect(report.characterIds).toEqual(party);
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
          expect(fs.existsSync(REPO_PATHS.AP_LEDGER())).toBe(true);
          const ledger = readApLedger(REPO_PATHS.AP_LEDGER());

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
          expect(alistarEntry!.advancementPoints.combat).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });
          expect(alistarEntry!.advancementPoints.exploration).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(alistarEntry!.advancementPoints.social).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });

          expect(daemarisEntry).toBeDefined();
          expect(daemarisEntry!.advancementPoints.combat).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });
          expect(daemarisEntry!.advancementPoints.exploration).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(daemarisEntry!.advancementPoints.social).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });

          expect(istavanEntry).toBeDefined();
          expect(istavanEntry!.advancementPoints.combat).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(istavanEntry!.advancementPoints.exploration).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(istavanEntry!.advancementPoints.social).toEqual({
            delta: 1,
            reason: 'normal',
          });
        },
      );
    });

    it('auto-selects the next pending session in Option R mode', async () => {
      await withTempRepo(
        'apply-ap-auto-mode',
        { initGit: false },
        async (repo) => {
          writeCharacterFiles();

          // Simulate finalized scribe logs for two sessions: session-0001 and session-0002
          // session-0001 (already completed)
          const logPath1 = path.join(
            REPO_PATHS.SESSIONS(),
            buildSessionFilename(1, '2025-09-25'),
          );
          const events1 = buildSessionEvents('session-0001', '2025-09-25');
          fs.writeFileSync(
            logPath1,
            events1.map((e) => JSON.stringify(e)).join('\n'),
          );
          // session-0002 (pending)
          const logPath2 = path.join(
            REPO_PATHS.SESSIONS(),
            buildSessionFilename(2, '2025-09-26'),
          );
          const events2 = buildSessionEvents('session-0002', '2025-09-26');
          fs.writeFileSync(
            logPath2,
            events2.map((e) => JSON.stringify(e)).join('\n'),
          );

          // Simulate completed report for session-0001
          const reportPath1 = path.join(
            REPO_PATHS.REPORTS(),
            'session-0001.yaml',
          );
          fs.writeFileSync(
            reportPath1,
            yaml.stringify({
              characterIds: party,
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
          const { exitCode, stderr, stdout } = await runWeave(['apply', 'ap'], {
            repo,
          });

          expect(exitCode).toBe(0);
          expect(stderr).toBeFalsy();

          // Verify session report output for session-0002
          const reportPath2 = path.join(
            REPO_PATHS.REPORTS(),
            'session-0002.yaml',
          );
          expect(fs.existsSync(reportPath2)).toBe(true);
          const report2 = yaml.parse(fs.readFileSync(reportPath2, 'utf8'));
          expect(report2.characterIds).toEqual(party);

          // Verify AP ledger output for session-0002
          expect(fs.existsSync(REPO_PATHS.AP_LEDGER())).toBe(true);
          const ledger = readApLedger(REPO_PATHS.AP_LEDGER());

          const alistarEntry = ledger.find(
            (e: any) =>
              e.sessionId === 'session-0002' && e.characterId === 'alistar',
          );
          expect(alistarEntry).toBeDefined();
          expect(alistarEntry!.advancementPoints.combat).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });
          expect(alistarEntry!.advancementPoints.exploration).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(alistarEntry!.advancementPoints.social).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });

          const daemarisEntry = ledger.find(
            (e: any) =>
              e.sessionId === 'session-0002' && e.characterId === 'daemaris',
          );
          expect(daemarisEntry).toBeDefined();
          expect(daemarisEntry!.advancementPoints.combat).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });
          expect(daemarisEntry!.advancementPoints.exploration).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(daemarisEntry!.advancementPoints.social).toEqual({
            delta: 1,
            reason: 'grandfathered',
          });

          const istavanEntry = ledger.find(
            (e: any) =>
              e.sessionId === 'session-0002' && e.characterId === 'istavan',
          );
          expect(istavanEntry).toBeDefined();
          expect(istavanEntry!.advancementPoints.combat).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(istavanEntry!.advancementPoints.exploration).toEqual({
            delta: 1,
            reason: 'normal',
          });
          expect(istavanEntry!.advancementPoints.social).toEqual({
            delta: 1,
            reason: 'normal',
          });
        },
      );
    });

    it('reports cleanly when no pending AP sessions are found (sweep mode)', async () => {
      await withTempRepo(
        'apply-ap-no-pending',
        { initGit: false },
        async (repo) => {
          writeCharacterFiles();

          // Finalized log for session-0001
          const events = buildSessionEvents('session-0001', '2025-09-25');
          fs.writeFileSync(
            path.join(
              REPO_PATHS.SESSIONS(),
              buildSessionFilename(1, '2025-09-25'),
            ),
            events.map((e) => JSON.stringify(e)).join('\n'),
          );

          // Completed report for session-0001
          fs.writeFileSync(
            path.join(REPO_PATHS.REPORTS(), 'session-0001.yaml'),
            yaml.stringify({
              status: 'completed',
              characterIds: party,
              sessionId: 'session-0001',
              advancementPoints: {
                combat: { number: 1, maxTier: 1 },
                exploration: { number: 1, maxTier: 2 },
                social: { number: 1, maxTier: 1 },
              },
            }),
          );

          // Run weave ap apply in auto-mode (Option R) with no pending sessions
          // eslint-disable-next-line no-unused-vars
          const { exitCode, stderr, stdout } = await runWeave(['apply', 'ap'], {
            repo,
          });

          // Benign no-op
          expect(exitCode).toBe(0);
          expect(stderr).toBeFalsy();
        },
      );
    });
  });

  describe('Session resolution', () => {
    it('finds completed session reports and finalized logs', async () => {
      await withTempRepo(
        'apply-ap-discovery',
        { initGit: false },
        async (repo) => {
          writeCharacterFiles();

          // Finalized log for session-0003
          const finalizedLogPath = path.join(
            REPO_PATHS.SESSIONS(),
            buildSessionFilename(3, '2025-09-27'),
          );
          fs.writeFileSync(
            finalizedLogPath,
            compileLog([
              sessionStart('session-0003', 'R14', '2025-09-27'),
              dayStart({ year: 1511, month: 'Umbraeus', day: 18 }),
              partySet(party),
              ap('exploration', 2, party, 'H1', 'Discovered ancient ruins'),
              dayEnd(14, 14),
              sessionEnd('session-0003'),
            ])
              .map((e) => JSON.stringify(e))
              .join('\n'),
          );

          // Finalized log for session-0004 (pending because report is not completed)
          const incompleteLogPath = path.join(
            REPO_PATHS.SESSIONS(),
            buildSessionFilename(4, '2025-09-28'),
          );
          fs.writeFileSync(
            incompleteLogPath,
            compileLog([
              sessionStart('session-0004', 'R14', '2025-09-28'),
              dayStart({ year: 1511, month: 'Umbraeus', day: 19 }),
              partySet(party),
              ap('exploration', 1, party, 'H2', 'Mapped the path to H3'),
              dayEnd(14, 14),
              sessionEnd('session-0004'),
            ])
              .map((e) => JSON.stringify(e))
              .join('\n'),
          );

          // Completed report for session-0003
          const completedReportPath = path.join(
            REPO_PATHS.REPORTS(),
            'session-0003.yaml',
          );
          fs.writeFileSync(
            completedReportPath,
            yaml.stringify({
              characterIds: party,
              status: 'completed',
              fingerprint: 'fp-0003',
              sessionId: 'session-0003',
              advancementPoints: [
                { pillar: 'exploration', number: 2, maxTier: 1 },
              ],
            }),
          );

          // Incomplete report for session-0004 (should be ignored)
          const incompleteReportPath = path.join(
            REPO_PATHS.REPORTS(),
            'session-0004.yaml',
          );
          fs.writeFileSync(
            incompleteReportPath,
            yaml.stringify({
              id: makeSessionId(4),
              status: 'planned', // not completed => pending
              absenceAllocations: [],
              downtime: [],
              gameStartDate: '21 Umbraeus 1511',
              schemaVersion: 2,
              scribeIds: ['session-0004_2025-09-28'],
              sessionDate: '2025-09-28',
              source: 'scribe',
            } satisfies SessionReport),
          );

          // Run weave ap apply in auto-mode to trigger discovery
          const { exitCode, stderr, stdout } = await runWeave(
            ['apply', 'ap', '--allow-dirty'],
            { repo },
          );

          expect(exitCode).toBe(0);
          expect(stderr).toBeFalsy();

          // Only session-0003 should be discovered and processed
          const ledger = readApLedger(REPO_PATHS.AP_LEDGER());
          const discoveredSessions = ledger.map((e: any) => e.sessionId);
          expect(discoveredSessions).toContain('session-0004');
          expect(discoveredSessions).not.toContain('session-0003');

          // Optionally, check stdout for discovery message
          expect(stdout).toMatch(/session-0004/);
          expect(stdout).not.toMatch(/session-0003/);
        },
      );
    });

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

    it('filters out guest PCs from AP processing and ledger entries', async () => {
      await withTempRepo(
        'apply-ap-guest-filtering',
        { initGit: false },
        async (repo) => {
          // Create character files for regular PCs only
          saveCharacters([{ key: 'alistar' }, { key: 'daemaris' }]);

          // Build session with mixed regular and guest PCs
          const sessionId = 'session-0001';
          const sessionDate = '2025-09-25';
          const regularParty = ['alistar', 'daemaris'];
          const mixedParty = [
            'alistar',
            guest('John', 'Korgath'),
            'daemaris',
            guest('Jane', 'Saurana'),
          ];

          const events = compileLog([
            sessionStart(sessionId, 'R14', sessionDate),
            dayStart({ year: 1511, month: 'Umbraeus', day: 17 }),
            partySet(mixedParty),
            ap('combat', 1, regularParty, 'A1', 'Defeated goblins'),
            ap('exploration', 2, regularParty, 'B1', 'Found a dungeon'),
            dayEnd(5, 5),
            sessionEnd(sessionId),
          ]);

          const logPath = path.join(
            REPO_PATHS.SESSIONS(),
            buildSessionFilename(1, sessionDate),
          );
          fs.writeFileSync(
            logPath,
            events.map((e) => JSON.stringify(e)).join('\n'),
          );

          // Apply AP
          const { exitCode, stderr } = await runWeave(
            ['apply', 'ap', sessionId],
            {
              repo,
            },
          );

          expect(exitCode).toBe(0);
          expect(stderr).toBeFalsy();

          // Verify session report contains only regular character IDs (guests filtered out)
          const reportPath = path.join(
            REPO_PATHS.REPORTS(),
            'session-0001.yaml',
          );
          expect(fs.existsSync(reportPath)).toBe(true);
          const report: SessionReport = yaml.parse(
            fs.readFileSync(reportPath, 'utf8'),
          );
          expect(report.status).toBe('completed');
          if (report.status === 'completed') {
            expect(report.characterIds).toEqual(['alistar', 'daemaris']);
            expect(report.characterIds).not.toContain('Korgath');
            expect(report.characterIds).not.toContain('Saurana');
          }

          // Verify AP ledger contains entries only for regular PCs (no guests)
          const ledger = readApLedger(REPO_PATHS.AP_LEDGER());
          const sessionEntries = ledger.filter(
            (e: any) => e.sessionId === sessionId,
          );

          expect(sessionEntries.length).toBe(2); // Only alistar and daemaris
          expect(
            sessionEntries.some((e: any) => e.characterId === 'alistar'),
          ).toBe(true);
          expect(
            sessionEntries.some((e: any) => e.characterId === 'daemaris'),
          ).toBe(true);

          // Verify no entries for guests
          expect(
            sessionEntries.some((e: any) => e.characterId === 'Korgath'),
          ).toBe(false);
          expect(
            sessionEntries.some((e: any) => e.characterId === 'Saurana'),
          ).toBe(false);
          expect(
            sessionEntries.some((e: any) => e.characterId === 'John'),
          ).toBe(false);
          expect(
            sessionEntries.some((e: any) => e.characterId === 'Jane'),
          ).toBe(false);
        },
      );
    });

    it.todo('collects AP events per character and pillar');
    it.todo('extracts in-world gameStartDate and gameEndDate if present');
  });

  describe('Idempotency', () => {
    it('is idempotent: repeat runs with same fingerprint make no changes', async () => {
      await withTempRepo(
        'apply-ap-idempotent',
        { initGit: false },
        async (repo) => {
          writeCharacterFiles();

          // Simulate finalized scribe logs for session-0001
          const logPath = path.join(
            REPO_PATHS.SESSIONS(),
            buildSessionFilename(1, '2025-09-25'),
          );
          const events = buildSessionEvents('session-0001', '2025-09-25');
          fs.writeFileSync(
            logPath,
            events.map((e) => JSON.stringify(e)).join('\n'),
          );

          // First run: apply AP for session-0001
          const resultFirst = await runWeave(['apply', 'ap', 'session-0001'], {
            repo,
          });
          expect(resultFirst.exitCode).toBe(0);
          expect(resultFirst.stderr).toBeFalsy();

          // Capture outputs after first run
          const reportPath = path.join(
            REPO_PATHS.REPORTS(),
            'session-0001.yaml',
          );
          const ledgerPath = path.join(repo, 'data', 'ap-ledger.jsonl');
          expect(fs.existsSync(reportPath)).toBe(true);
          expect(fs.existsSync(ledgerPath)).toBe(true);
          const reportFirst = fs.readFileSync(reportPath, 'utf8');
          const ledgerFirst = fs.readFileSync(ledgerPath, 'utf8');

          // Second run: re-apply AP for session-0001 (should be a no-op)
          const resultSecond = await runWeave(['apply', 'ap', 'session-0001'], {
            repo,
          });
          expect(resultSecond.exitCode).toBe(0);
          expect(resultSecond.stderr).toBeFalsy();
          expect(resultSecond.stdout).toMatch(/no changes made/i);

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
