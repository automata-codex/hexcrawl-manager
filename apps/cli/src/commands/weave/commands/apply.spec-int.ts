import { loadMeta, REPO_PATHS } from '@skyreach/data';
import {
  dayEnd,
  dayStart,
  compileLog,
  partySet,
  runWeave,
  withTempRepo,
  trail,
  sessionStart,
  sessionEnd,
  ap,
  saveCharacters,
  CharacterKey,
} from '@skyreach/test-helpers';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

import { readApLedger } from '../../../services/ap-ledger.service';

const party: CharacterKey[] = ['alistar', 'daemaris', 'istavan'];

describe('Function `weave apply`', () => {
  it('weave apply: Trails continues on no-op and applies next; AP applies one (exit 0)', async () => {
    await withTempRepo(
      'weave-apply-umbrella-happy',
      { initGit: false },
      async (repo) => {
        // --- Trails setup ---
        const session5Id = 'session_0005_2025-09-29';
        const session6Id = 'session_0006_2025-09-30';

        // session-0005: valid envelope, but no trail() -> NoChangesError (benign)
        fs.writeFileSync(
          path.join(REPO_PATHS.SESSIONS(), `${session5Id}.jsonl`),
          compileLog(
            [
              sessionStart(session5Id, 'H7', '2025-09-29'),
              dayStart({ year: 1511, month: 'Umbraeus', day: 20 }),
              partySet(party),
              ap('combat', 1, party, 'H7', 'Defeated goblins'),
              // no trail event
              dayEnd(14, 14),
              sessionEnd(session5Id),
            ],
            { startTime: '2025-09-29' },
          )
            .map((e) => JSON.stringify(e))
            .join('\n'),
        );

        // session-0006: has a trail() -> should be applied
        fs.writeFileSync(
          path.join(REPO_PATHS.SESSIONS(), `${session6Id}.jsonl`),
          compileLog(
            [
              sessionStart(session6Id, 'H7', '2025-09-30'),
              dayStart({ year: 1511, month: 'Umbraeus', day: 21 }),
              partySet(party),
              ap('exploration', 2, party, 'H8', 'Found a hidden dungeon'),
              trail('H7', 'H8'),
              ap('social', 1, party, 'H8', 'Talked to the alseid'),
              dayEnd(14, 14),
              sessionEnd(session6Id),
            ],
            { startTime: '2025-09-30' },
          )
            .map((e) => JSON.stringify(e))
            .join('\n'),
        );

        // --- AP setup ---
        saveCharacters(party.map((pc) => ({ key: pc })));

        // --- Run umbrella apply ---
        const { exitCode, stderr, stdout } = await runWeave(
          ['apply', '--allow-dirty'],
          { repo },
        );

        // console.log('STDOUT:', stdout);
        // console.log('STDERR:', stderr);

        // Umbrella exit and messaging
        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        // --- Trails assertions ---
        // Should indicate a no-op/skip for 0005, and applied 0006
        expect(stdout).toMatch(/no changes|no-op|nothing to apply/i);
        expect(stdout).toMatch(/session[_-]0006/i);
        // Aggregated line when multiple items were seen
        expect(stdout).toMatch(/Trail files:\s*applied\s+1,\s*skipped\s+1/i);

        // Meta: only the applied session is recorded
        const meta = loadMeta();
        expect(meta.state.trails.applied?.appliedSessions).not.toContain(
          `${session5Id}.jsonl`,
        );
        expect(meta.state.trails.applied?.appliedSessions).toContain(
          `${session6Id}.jsonl`,
        );

        // --- AP assertions ---
        // Printed “Applied session-0005” block
        expect(stdout).toMatch(/Applied session-0005/i);

        // Ledger actually updated -- other tests ensure correctness of AP calc
        const ledger = readApLedger(REPO_PATHS.AP_LEDGER());
        const appliedSessions = ledger.map((e: any) => e.sessionId);
        expect(appliedSessions).toContain('session-0005');
      },
    );
  });
});
