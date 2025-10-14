import { REPO_PATHS, loadMeta } from '@skyreach/data';
import { ScribeEvent } from '@skyreach/schemas';
import {
  compileLog,
  dayEnd,
  dayStart,
  move,
  partySet,
  runWeave,
  sessionEnd,
  sessionStart,
  trail,
  withTempRepo,
} from '@skyreach/test-helpers';
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import yaml from 'yaml';

describe('Command `weave apply trails`', () => {
  const party = ['alistar', 'daemaris', 'istavan'];

  it('applies trails for a specific session (explicit path)', async () => {
    await withTempRepo(
      'apply-trails-session-explicit',
      { initGit: false },
      async (repo) => {
        // --- Seed data files ---
        // Empty trails to start
        fs.writeFileSync(REPO_PATHS.TRAILS(), yaml.stringify({}));

        // Havens can be empty for this test (adjust if your rollover/session logic needs them)
        fs.writeFileSync(REPO_PATHS.HAVENS(), yaml.stringify([]));

        // Meta: include the season in rolledSeasons so the session passes chronology
        fs.writeFileSync(
          REPO_PATHS.META(),
          yaml.stringify({
            rolledSeasons: ['1511-spring', '1511-summer'],
            nextSessionSeq: 2,
            appliedSessions: [],
          }),
        );

        // --- Finalized session log (JSONL) ---
        const sessionId = 'session_0001_2025-10-01';
        const sessionFile = path.join(
          REPO_PATHS.SESSIONS(),
          `${sessionId}.jsonl`,
        );

        const events = compileLog([
          sessionStart(sessionId, 'R14', '2025-10-01'),
          dayStart({ year: 1511, month: 'Lucidus', day: 31 }),
          move('R14', 'Q13'),
          trail('Q13', 'R14'),
          sessionEnd(sessionId),
        ]);
        fs.writeFileSync(
          sessionFile,
          events.map((e) => JSON.stringify(e)).join('\n'),
        );

        // --- Run CLI: weave apply trails <sessionFile> ---
        // eslint-disable-next-line no-unused-vars
        const { exitCode, stderr, stdout } = await runWeave(
          ['apply', 'trails', 'session-0001', '--allow-dirty'],
          { repo },
        );

        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        // --- Assert: trails.yaml updated with the new edge ---
        expect(fs.existsSync(REPO_PATHS.TRAILS())).toBe(true);
        const trails = yaml.parse(fs.readFileSync(REPO_PATHS.TRAILS(), 'utf8'));

        // Normalized key should exist (p12-p13, not p13-p12)
        expect(trails['q13-r14']).toBeDefined();
        // These fields are typical—adjust if your schema differs:
        expect(trails['q13-r14']).toMatchObject({
          usedThisSeason: true,
          permanent: expect.any(Boolean),
          streak: expect.any(Number),
          lastSeasonTouched: '1511-summer',
        });

        // --- Assert: meta updated with applied session ---
        const meta = yaml.parse(fs.readFileSync(REPO_PATHS.META(), 'utf8'));
        expect(meta.state.trails.applied?.appliedSessions).toContain(
          'session_0001_2025-10-01.jsonl',
        );

        // --- Assert: footprint written with session kind & season ---
        const footprintsDir = REPO_PATHS.FOOTPRINTS(); // adjust if different
        const files = fs.readdirSync(footprintsDir);
        const sessionFoot = files.find((f) => f.includes('S-0001_2025-10-01'));
        expect(sessionFoot).toBeTruthy();
        const foot = yaml.parse(
          fs.readFileSync(path.join(footprintsDir, sessionFoot!), 'utf8'),
        );
        expect(foot.kind).toBe('session');
        expect(foot.seasonId).toBe('1511-summer');
        expect(foot.inputs.sourceFile).toBe(sessionFile);
        // Effects should record created/rediscovered/used flags
        expect(foot.effects.session).toBeDefined();
      },
    );
  });

  it('applies trails for a seasonal rollover (explicit path)', async () => {
    await withTempRepo(
      'apply-trails-rollover-explicit',
      { initGit: false },
      async (repo) => {
        // --- Seed trails with a couple edges in-use this season (to exercise rollover effects) ---
        fs.writeFileSync(
          REPO_PATHS.TRAILS(),
          yaml.stringify({
            'o17-p17': {
              permanent: false,
              streak: 0,
              lastSeasonTouched: '1511-autumn',
              usedThisSeason: true,
            },
            'p12-p13': {
              permanent: false,
              streak: 1,
              lastSeasonTouched: '1511-autumn',
              usedThisSeason: true,
            },
          }),
        );

        fs.writeFileSync(REPO_PATHS.HAVENS(), yaml.stringify([]));

        // Meta before rollover: no rolled seasons yet
        fs.writeFileSync(
          REPO_PATHS.META(),
          yaml.stringify({
            rolledSeasons: [],
            nextSessionSeq: 2,
            appliedSessions: [],
          }),
        );

        // --- Finalized rollover log (JSONL) ---
        const rollFile = path.join(
          REPO_PATHS.ROLLOVERS(),
          'rollover_1511-autumn.jsonl',
        );
        const rollEvents: [ScribeEvent] = [
          {
            seq: 1,
            ts: '2025-11-01T00:00:00.000Z',
            kind: 'season_rollover',
            payload: { seasonId: '1511-autumn' },
          },
        ];
        fs.writeFileSync(
          rollFile,
          rollEvents.map((e) => JSON.stringify(e)).join('\n'),
        );

        // --- Run CLI: weave apply trails <rolloverFile> ---
        // eslint-disable-next-line no-unused-vars
        const { exitCode, stderr, stdout } = await runWeave(
          ['apply', 'trails', '1511-autumn', '--allow-dirty'],
          { repo },
        );

        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        // --- Assert: trails updated (e.g., usedThisSeason reset / persisted/deleted applied) ---
        const trails = yaml.parse(fs.readFileSync(REPO_PATHS.TRAILS(), 'utf8'));
        // We don’t over-assert specifics (depends on your rollover rules), just ensure keys are present
        // and shape is intact:
        expect(typeof trails).toBe('object');
        const someEdge = Object.keys(trails)[0];
        expect(trails[someEdge]).toHaveProperty('permanent');
        expect(trails[someEdge]).toHaveProperty('streak');

        // --- Assert: meta updated with rolled season and applied session id ---
        const meta = yaml.parse(fs.readFileSync(REPO_PATHS.META(), 'utf8'));
        expect(meta.state.trails.applied?.rolledSeasons).toContain(
          '1511-autumn',
        );
        expect(meta.state.trails.applied?.appliedSessions).toContain(
          'rollover_1511-autumn.jsonl',
        );

        // --- Assert: rollover footprint written with effects ---
        const footprintsDir = REPO_PATHS.FOOTPRINTS(); // adjust if different
        const files = fs.readdirSync(footprintsDir);
        const rollFoot = files.find((f) => f.includes('ROLL-1511-autumn'));
        expect(rollFoot).toBeTruthy();
        const foot = yaml.parse(
          fs.readFileSync(path.join(footprintsDir, rollFoot!), 'utf8'),
        );
        expect(foot.kind).toBe('rollover');
        expect(foot.seasonId).toBe('1511-autumn');
        expect(foot.inputs.sourceFile).toBe(rollFile);
        // Effects should include maintained/persisted/deletedTrails sets
        expect(foot.effects.rollover).toBeDefined();
      },
    );
  });

  it('auto-discovers and applies sessions in world order (oldest first) across runs', async () => {
    await withTempRepo(
      'apply-trails-discovery-world-order',
      { initGit: false },
      async (repo) => {
        const session3Id = 'session_0003_2025-09-27';
        const session4Id = 'session_0004_2025-09-28';

        // session-0003 with a trail event
        fs.writeFileSync(
          path.join(REPO_PATHS.SESSIONS(), `${session3Id}.jsonl`),
          compileLog(
            [
              sessionStart(session3Id, 'H1', '2025-09-27'),
              dayStart({ year: 1511, month: 'Umbraeus', day: 18 }),
              partySet(party),
              trail('H1', 'H2'),
              dayEnd(14, 14),
              sessionEnd(session3Id),
            ],
            { startTime: '2025-09-27' },
          )
            .map((e) => JSON.stringify(e))
            .join('\n'),
        );

        // session-0004 with a trail event
        fs.writeFileSync(
          path.join(REPO_PATHS.SESSIONS(), `${session4Id}.jsonl`),
          compileLog(
            [
              sessionStart(session4Id, 'H2', '2025-09-28'),
              dayStart({ year: 1511, month: 'Umbraeus', day: 19 }),
              partySet(party),
              trail('H2', 'H3'),
              dayEnd(14, 14),
              sessionEnd(session4Id),
            ],
            { startTime: '2025-09-28' },
          )
            .map((e) => JSON.stringify(e))
            .join('\n'),
        );

        const { exitCode, stderr, stdout } = await runWeave(
          ['apply', 'trails', '--allow-dirty'],
          { repo },
        );

        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();
        expect(stdout).toMatch(/session[_-]0003/i);
        expect(stdout).toMatch(/session[_-]0004/i);

        const meta = loadMeta();
        expect(meta.state.trails.applied?.appliedSessions).toEqual(
          expect.arrayContaining([
            `${session3Id}.jsonl`,
            `${session4Id}.jsonl`,
          ]),
        );
      },
    );
  });

  it('continues past sessions with no trail changes and applies the next eligible session', async () => {
    await withTempRepo(
      'apply-trails-discovery-skip-noop',
      { initGit: false },
      async (repo) => {
        const session5Id = 'session_0005_2025-09-29';
        const session6Id = 'session_0006_2025-09-30';

        // session-0005: valid envelope, but no 'trail' events -> NoChangesError path
        fs.writeFileSync(
          path.join(REPO_PATHS.SESSIONS(), 'session_0005_2025-09-29.jsonl'),
          compileLog(
            [
              sessionStart(session5Id, 'H3', '2025-09-29'),
              dayStart({ year: 1511, month: 'Umbraeus', day: 20 }),
              partySet(party),
              move('H3', 'H4'),
              dayEnd(14, 14),
              sessionEnd(session5Id),
            ],
            { startTime: '2025-09-29' },
          )
            .map((e) => JSON.stringify(e))
            .join('\n'),
        );

        // session-0006: has a trail event -> should be applied
        fs.writeFileSync(
          path.join(REPO_PATHS.SESSIONS(), 'session_0006_2025-09-30.jsonl'),
          compileLog(
            [
              sessionStart(session6Id, 'H4', '2025-09-30'),
              dayStart({ year: 1511, month: 'Umbraeus', day: 21 }),
              partySet(party),
              trail('H4', 'H3'),
              dayEnd(14, 14),
              sessionEnd(session6Id),
            ],
            { startTime: '2025-09-30' },
          )
            .map((e) => JSON.stringify(e))
            .join('\n'),
        );

        // eslint-disable-next-line no-unused-vars
        const { exitCode, stderr, stdout } = await runWeave(
          ['apply', 'trails', '--allow-dirty'],
          { repo },
        );

        // Expect some "no-op" style indication for 0005, and a positive apply for 0006.
        // (Adjust regexes to match your CLI print strings.)
        expect(stdout).toMatch(/no changes|no-op|nothing to apply/i);
        expect(stdout).toMatch(/session[_-]0006/i);

        const meta = loadMeta();

        // No footprint/meta entry for the no-op session
        expect(meta.state.trails.applied?.appliedSessions).not.toContain(
          'session_0005_2025-09-29.jsonl',
        );

        // Applied session recorded
        expect(meta.state.trails.applied?.appliedSessions).toContain(
          'session_0006_2025-09-30.jsonl',
        );
      },
    );
  });
});
