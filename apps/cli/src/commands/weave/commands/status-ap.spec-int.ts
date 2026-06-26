import { REPO_PATHS, buildSessionFilename } from '@achm/data';
import { rewriteApLedger } from '@achm/data';
import { ApLedgerEntry, makeSessionId, padSessionNum } from '@achm/schemas';
import {
  makeCompletedSessionReport,
  makePlannedSessionReport,
  makeSessionAp,
  makeSessionApGrid,
  normalAp,
  runWeave,
  saveCharacter,
  withTempRepo,
} from '@achm/test-helpers';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import yaml from 'yaml';

// AP Status Command Test Suite (specs: ap-workflow-overview.md, ap-status.md)
describe('Command `weave ap status`', () => {
  // Core aggregation and output
  it('aggregates pillar totals per character from the AP ledger', async () => {
    await withTempRepo(
      'ap-status-aggregate',
      { initGit: false },
      async (repo) => {
        // Write minimal AP ledger
        const ledger = makeSessionApGrid({
          characters: ['alistar', 'daemaris'],
          sessions: [1, 2],
          appliedAtBySession: (s) =>
            s === 1 ? '2025-09-27T23:27:21.381Z' : '2025-09-28T23:27:21.381Z',
        });
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), ledger);

        // Write minimal character files
        const charactersDir = path.join(repo, 'data', 'characters');
        fs.mkdirSync(charactersDir, { recursive: true });
        fs.writeFileSync(
          path.join(charactersDir, 'alistar.yaml'),
          yaml.stringify({ id: 'alistar', displayName: 'Alistar', level: 1 }),
        );
        fs.writeFileSync(
          path.join(charactersDir, 'daemaris.yaml'),
          yaml.stringify({ id: 'daemaris', displayName: 'Daemaris', level: 1 }),
        );

        // Run the CLI command
        const { exitCode, stdout, stderr } = await runWeave(['status', 'ap'], {
          repo,
        });
        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        // Check that output aggregates pillar totals per character
        // Example output: | Character | Combat | Exploration |
        expect(stdout).toContain('alistar');
        expect(stdout).toContain('daemaris');
        expect(stdout).toMatch(/alistar.*2.*2/); // 2 combat, 2 exploration
        expect(stdout).toMatch(/daemaris.*2.*2/); // 2 combat, 2 exploration
      },
    );
  });

  it('derives absence credits at runtime for Tier 1 characters not in downtime', async () => {
    await withTempRepo(
      'ap-status-absence-derivation',
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

        // --- AP Ledger: spend 1 absence credit (social) at/after session 3 ---
        const ledger: ApLedgerEntry[] = [
          {
            kind: 'absence_spend' as const,
            appliedAt: '2025-09-29T23:00:00Z',
            characterId: 'alistar',
            sessionId: makeSessionId(3),
            notes: 'Claimed one absence reward (social)',
            advancementPoints: {
              combat: { delta: 0, reason: 'absence_spend' as const },
              exploration: { delta: 0, reason: 'absence_spend' as const },
              social: { delta: 1, reason: 'absence_spend' as const },
            },
          },
        ];
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), ledger);

        // --- Run status with JSON output for structured assertions ---
        const { exitCode, stdout, stderr } = await runWeave(['status', 'ap'], {
          repo,
        });

        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        const awardsBlock = (() => {
          const lines = stdout.split(/\r?\n/);
          const start = lines.findIndex((l) =>
            /Unclaimed Absence Awards/i.test(l),
          );
          if (start < 0) return '';

          // collect until we've seen the *third* dashed separator after start
          let dashCount = 0;
          const block: string[] = [];
          for (let i = start; i < lines.length; i++) {
            block.push(lines[i]);
            if (/^-{3,}\s*$/.test(lines[i])) {
              dashCount++;
              if (dashCount === 3) break; // third dashed line marks the footer
            }
          }
          return block.join('\n');
        })();

        const alistarLine = awardsBlock
          .split(/\r?\n/)
          .find((line) => /^Alistar\s+/i.test(line));
        expect(
          alistarLine,
          'expected an Alistar row in absence awards table',
        ).toBeTruthy();

        expect(alistarLine).toMatch(/Alistar\s+3\s+1\s+2/);
      },
    );
  });

  it.todo('shows earned, spent, and available absence credits');
  it.todo('outputs a human-readable table by default');
  it.todo('outputs structured JSON when --json is passed');
  it.todo('suppresses headers/summary with --quiet (table only)');

  // Filtering and windowing
  it.todo('filters output to specified character(s) with --character');
  it.todo('constrains session window with --since and --until');
  it.todo('defaults to full campaign range if no window is specified');

  // Absence credit rules
  it.todo('does not award credits to Tier 2+ characters');
  it.todo('does not award credits if character is in downtime for a session');
  it.todo('does not award credits to guests');
  it.todo(
    'does not award credits to characters who have never attended and have no intro marker',
  );
  it.todo(
    'begins credit accrual at introducedAt/firstSessionId if present, else first attendance',
  );
  it.todo(
    'handles credits correctly when a character’s level is missing (treat as Tier 1)',
  );

  // Pillar reason handling
  it.todo(
    'includes all reasons in pillar sums (normal, cap, absence_spend, downtime, correction, grandfathered)',
  );
  it.todo(
    'does not reinterpret reasons or re-apply event gates; trusts ledger',
  );

  // Output details
  it.todo('includes notes for missing level or no intro marker');
  it.todo('shows summary line with character count and session window');

  // Error handling
  it.todo('exits non-zero and reports missing or unreadable files');
  it.todo('exits non-zero and reports schema validation errors');
  it.todo('exits non-zero and reports unknown characterId in --character');
  it.todo('exits zero on success');

  // Edge cases
  it.todo('handles sessions with multiple log parts and correct ordering');
  it.todo('handles sessions with duplicate sessionDate');
  it.todo('handles ledger with only absence_spend entries');
  it.todo('handles empty ledger and reports zeroes');
  it.todo('handles sessions with no attendance');
  it.todo('handles sessions with only guests');
  it.todo('handles windowing that excludes all sessions');

  // Milestone awards table (Phase 5)
  it('renders a milestone AP table from session_ap top-ups and milestone_spend ledger deltas', async () => {
    await withTempRepo(
      'ap-status-milestone-table',
      { initGit: false },
      async (repo) => {
        // Two characters, both present at session-0001 which has one
        // structured milestone event in its JSONL log. Pillar AP is already
        // applied for the session, so each character's eligible milestone AP is
        // the top-up max(0, 3 - sessionTotal): Alistar earned 1 pillar AP (top-up
        // 2), Daemaris earned 2 (top-up 1). Alistar has claimed his milestone
        // (one milestone_spend entry whose deltas sum to 2 AP); Daemaris has not.
        saveCharacter('alistar', { level: 1 });
        saveCharacter('daemaris', { level: 1 });

        const reportPath = path.join(REPO_PATHS.REPORTS(), 'session-0001.yaml');
        const completed = makeCompletedSessionReport({
          n: 1,
          date: '2025-09-01',
          present: ['alistar', 'daemaris'],
        });
        fs.writeFileSync(reportPath, yaml.stringify(completed));

        // JSONL log for session-0001 with a structured `milestone` event.
        const logPath = path.join(
          REPO_PATHS.SESSIONS(),
          buildSessionFilename(1, '2025-09-01'),
        );
        fs.writeFileSync(
          logPath,
          JSON.stringify({
            seq: 1,
            ts: '2025-09-01T20:00:00.000Z',
            kind: 'milestone',
            payload: { note: 'Survived the Winter' },
          }) + '\n',
        );

        // Ledger:
        //  - session_ap for both characters (so the milestone top-up is computed
        //    from real pillar AP instead of defaulting to the cap): Alistar 1 AP
        //    -> top-up 2, Daemaris 2 AP -> top-up 1.
        //  - one milestone_spend for Alistar whose deltas sum to 2 AP (his
        //    top-up); Daemaris has none. This exercises that "claimed" is the sum
        //    of deltas, not a count of entries.
        const ledger: ApLedgerEntry[] = [
          makeSessionAp({
            characterId: 'alistar',
            session: 1,
            appliedAt: '2025-09-01T12:00:00.000Z',
            deltas: normalAp({ combat: 1 }),
          }),
          makeSessionAp({
            characterId: 'daemaris',
            session: 1,
            appliedAt: '2025-09-01T12:00:00.000Z',
            deltas: normalAp({ combat: 1, exploration: 1 }),
          }),
          {
            kind: 'milestone_spend',
            advancementPoints: {
              combat: { delta: 1, reason: 'normal' },
              exploration: { delta: 1, reason: 'normal' },
              social: { delta: 0, reason: 'normal' },
            },
            appliedAt: '2025-09-01T12:30:00.000Z',
            characterId: 'alistar',
            sessionId: makeSessionId(1),
          },
        ];
        rewriteApLedger(REPO_PATHS.AP_LEDGER(), ledger);

        const { exitCode, stdout, stderr } = await runWeave(
          ['status', 'ap'],
          { repo },
        );
        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        // Find the Milestone AP block in the output
        const lines = stdout.split(/\r?\n/);
        const start = lines.findIndex((l) => /Milestone AP/i.test(l));
        expect(start).toBeGreaterThan(-1);
        const milestoneBlock = lines.slice(start, start + 8).join('\n');

        // Alistar: eligible 2 (top-up), claimed 2 (delta sum from one entry),
        // unclaimed 0
        expect(milestoneBlock).toMatch(/Alistar\s+2\s+2\s+0/);
        // Daemaris: eligible 1 (top-up), claimed 0, unclaimed 1
        expect(milestoneBlock).toMatch(/Daemaris\s+1\s+0\s+1/);
      },
    );
  });
});
