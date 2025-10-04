import { REPO_PATHS } from '@skyreach/data';
import { ApLedgerEntry } from '@skyreach/schemas';
import { runWeave, withTempRepo } from '@skyreach/test-helpers';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import yaml from 'yaml';

import { rewriteApLedger } from '../../../../services/ap-ledger.service';

// AP Status Command Test Suite (specs: ap-workflow-overview.md, ap-status.md)
describe('Command `weave ap status`', () => {
  // Core aggregation and output
  it('aggregates pillar totals per character from the AP ledger', async () => {
    await withTempRepo(
      'ap-status-aggregate',
      { initGit: false },
      async (repo) => {
        // Write minimal AP ledger
        const ledger: ApLedgerEntry[] = [
          {
            sessionId: 'session-0001',
            advancementPoints: {
              combat: { delta: 1, reason: 'normal' },
              exploration: { delta: 1, reason: 'normal' },
              social: { delta: 1, reason: 'normal' },
            },
            appliedAt: '2025-09-27T23:27:21.381Z',
            characterId: 'alistar',
            kind: 'session_ap',
          },
          {
            sessionId: 'session-0002',
            advancementPoints: {
              combat: { delta: 1, reason: 'normal' },
              exploration: { delta: 1, reason: 'normal' },
              social: { delta: 1, reason: 'normal' },
            },
            appliedAt: '2025-09-28T23:27:21.381Z',
            characterId: 'alistar',
            kind: 'session_ap',
          },
          {
            sessionId: 'session-0001',
            advancementPoints: {
              combat: { delta: 1, reason: 'normal' },
              exploration: { delta: 1, reason: 'normal' },
              social: { delta: 1, reason: 'normal' },
            },
            appliedAt: '2025-09-27T23:27:21.381Z',
            characterId: 'daemaris',
            kind: 'session_ap',
          },
          {
            sessionId: 'session-0002',
            advancementPoints: {
              combat: { delta: 1, reason: 'normal' },
              exploration: { delta: 1, reason: 'normal' },
              social: { delta: 1, reason: 'normal' },
            },
            appliedAt: '2025-09-28T23:27:21.381Z',
            characterId: 'daemaris',
            kind: 'session_ap',
          },
        ];
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
        const { exitCode, stdout, stderr } = await runWeave(['ap', 'status'], {
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

  it.todo(
    'derives absence credits at runtime for Tier 1 characters not in downtime',
  );
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
});
