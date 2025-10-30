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

        // Meta: include the season in seasons so the session passes chronology
        fs.writeFileSync(
          REPO_PATHS.META(),
          yaml.stringify({
            version: 2,
            nextSessionSeq: 2,
            state: {
              trails: {
                backend: 'meta',
                applied: {
                  sessions: [],
                  seasons: ['1511-spring', '1511-summer'],
                },
              },
              ap: {
                backend: 'ledger',
              },
            },
          }),
        );

        // --- Finalized session log (JSONL) ---
        const sessionId = 'session-0001_2025-10-01';
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
        expect(meta.state.trails.applied?.sessions).toContain(
          'session-0001_2025-10-01.jsonl',
        );

        // --- Assert: footprint written with session kind & season ---
        const footprintsDir = REPO_PATHS.FOOTPRINTS('trails'); // trails domain
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
            version: 2,
            nextSessionSeq: 2,
            state: {
              trails: {
                backend: 'meta',
                applied: {
                  sessions: [],
                  seasons: [],
                },
              },
              ap: {
                backend: 'ledger',
              },
            },
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
        expect(meta.state.trails.applied?.seasons).toContain('1511-autumn');
        expect(meta.state.trails.applied?.sessions).toContain(
          'rollover_1511-autumn.jsonl',
        );

        // --- Assert: rollover footprint written to rollovers directory ---
        const rolloversDir = REPO_PATHS.ROLLOVERS();
        const files = fs.readdirSync(rolloversDir);
        const rollFoot = files.find((f) => f.includes('ROLL-1511-autumn'));
        expect(rollFoot).toBeTruthy();
        const foot = yaml.parse(
          fs.readFileSync(path.join(rolloversDir, rollFoot!), 'utf8'),
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
        const session3Id = 'session-0003_2025-09-27';
        const session4Id = 'session-0004_2025-09-28';

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
        expect(meta.state.trails.applied?.sessions).toEqual(
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
        const session5Id = 'session-0005_2025-09-29';
        const session6Id = 'session-0006_2025-09-30';

        // session-0005: valid envelope, but no 'trail' events -> NoChangesError path
        fs.writeFileSync(
          path.join(REPO_PATHS.SESSIONS(), 'session-0005_2025-09-29.jsonl'),
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
          path.join(REPO_PATHS.SESSIONS(), 'session-0006_2025-09-30.jsonl'),
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

        // Expect indication of no changes for 0005, and a positive apply for 0006.
        expect(stdout).toMatch(/no changes|no-op|nothing to apply/i);
        expect(stdout).toMatch(/session[_-]0006/i);

        const meta = loadMeta();

        // No-op session is still marked as applied to prevent re-processing
        expect(meta.state.trails.applied?.sessions).toContain(
          'session-0005_2025-09-29.jsonl',
        );

        // Applied session also recorded
        expect(meta.state.trails.applied?.sessions).toContain(
          'session-0006_2025-09-30.jsonl',
        );
      },
    );
  });

  it('automatically applies rollover when season changes between sessions', async () => {
    await withTempRepo(
      'apply-trails-auto-rollover',
      { initGit: false },
      async (repo) => {
        // --- Seed initial trails (from summer 1511 session) ---
        fs.writeFileSync(
          REPO_PATHS.TRAILS(),
          yaml.stringify({
            'o17-p17': {
              permanent: false,
              streak: 1,
              lastSeasonTouched: '1511-summer',
              usedThisSeason: true,
            },
            'p12-p13': {
              permanent: false,
              streak: 0,
              lastSeasonTouched: '1511-summer',
              usedThisSeason: false, // This one wasn't used and should be subject to decay
            },
          }),
        );

        fs.writeFileSync(REPO_PATHS.HAVENS(), yaml.stringify([]));

        // Meta: summer session has been applied, no explicit autumn rollover yet
        fs.writeFileSync(
          REPO_PATHS.META(),
          yaml.stringify({
            version: 2,
            nextSessionSeq: 3,
            state: {
              trails: {
                backend: 'meta',
                applied: {
                  sessions: ['session-0001_2025-09-20.jsonl'],
                  seasons: ['1511-spring', '1511-summer'],
                },
              },
              ap: {
                backend: 'ledger',
              },
            },
          }),
        );

        // Create footprints directory (for session footprints)
        const footprintsDir = REPO_PATHS.FOOTPRINTS('trails');
        fs.mkdirSync(footprintsDir, { recursive: true });

        // Create rollovers directory (for rollover footprints)
        const rolloversDir = REPO_PATHS.ROLLOVERS();
        fs.mkdirSync(rolloversDir, { recursive: true });

        // --- Create autumn session (season change from summer -> autumn) ---
        const autumnSessionId = 'session-0002_2025-10-15';
        const autumnSessionFile = path.join(
          REPO_PATHS.SESSIONS(),
          `${autumnSessionId}.jsonl`,
        );

        const events = compileLog([
          sessionStart(autumnSessionId, 'O17', '2025-10-15'),
          dayStart({ year: 1511, month: 'Fructara', day: 1 }), // First month of autumn
          partySet(party),
          move('O17', 'P17'), // Use the o17-p17 trail
          sessionEnd(autumnSessionId),
        ]);
        fs.writeFileSync(
          autumnSessionFile,
          events.map((e: ScribeEvent) => JSON.stringify(e)).join('\n'),
        );

        // --- Apply autumn session (should trigger automatic rollover) ---
        const { exitCode, stderr, stdout } = await runWeave(
          ['apply', 'trails', 'session-0002', '--allow-dirty'],
          { repo },
        );

        if (exitCode !== 0) {
          console.log('stdout:', stdout);
          console.log('stderr:', stderr);
        }

        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        // --- Verify automatic rollover was applied ---
        const meta = loadMeta();

        // Autumn 1511 season should be in seasons now
        expect(meta.state.trails.applied?.seasons).toContain('1511-autumn');

        // --- Verify trail decay logic ran ---
        const trails = yaml.parse(fs.readFileSync(REPO_PATHS.TRAILS(), 'utf8'));

        // o17-p17 was used in summer, should persist with streak increased
        expect(trails['o17-p17']).toBeDefined();
        expect(trails['o17-p17'].streak).toBe(2); // Was 1, now 2 from rollover
        expect(trails['o17-p17'].usedThisSeason).toBe(true); // Used in autumn session

        // p12-p13 was NOT used in summer, should have been subject to decay roll
        // It might be deleted (d6 1-3) or persisted with streak reset to 0 (d6 4-6)
        // We can't predict the dice roll, but we can verify the footprint captured it
        const rolloverFiles = fs.readdirSync(rolloversDir);
        const autoRollFoot = rolloverFiles.find((f) =>
          f.includes('ROLL-1511-autumn'),
        );
        expect(autoRollFoot).toBeTruthy();

        const rollFootprint = yaml.parse(
          fs.readFileSync(path.join(rolloversDir, autoRollFoot!), 'utf8'),
        );
        expect(rollFootprint.id).toBe('ROLL-1511-autumn');
        expect(rollFootprint.kind).toBe('rollover');
        expect(rollFootprint.seasonId).toBe('1511-autumn');
        expect(rollFootprint.inputs.note).toContain('Automatic rollover'); // Verify it was auto-applied
        expect(rollFootprint.inputs.note).toContain(
          'inter-session season change',
        );

        // The rollover should have processed both trails
        const rollEffects = rollFootprint.effects.rollover;
        expect(rollEffects.persisted).toContain('o17-p17');
        // p12-p13 either in deletedTrails or persisted with streak reset
        const p12p13Affected =
          rollEffects.deletedTrails.includes('p12-p13') ||
          rollEffects.persisted.includes('p12-p13');
        expect(p12p13Affected).toBe(true);
      },
    );
  });

  it('automatically applies rollover when seasons list is empty but session footprints exist', async () => {
    await withTempRepo(
      'apply-trails-auto-rollover-empty-seasons',
      { initGit: false },
      async (repo) => {
        // --- Seed initial trails (from summer 1511 session) ---
        fs.writeFileSync(
          REPO_PATHS.TRAILS(),
          yaml.stringify({
            'o17-p17': {
              permanent: false,
              streak: 1,
              lastSeasonTouched: '1511-summer',
              usedThisSeason: true,
            },
          }),
        );

        fs.writeFileSync(REPO_PATHS.HAVENS(), yaml.stringify([]));

        // Meta with NO seasons (empty list) but has an applied session
        fs.writeFileSync(
          REPO_PATHS.META(),
          yaml.stringify({
            version: 2,
            nextSessionSeq: 3,
            state: {
              trails: {
                backend: 'meta',
                applied: {
                  sessions: ['session-0001_2025-09-20.jsonl'],
                  seasons: [], // EMPTY - this is the key test case
                },
              },
              ap: {
                backend: 'ledger',
              },
            },
          }),
        );

        // Create footprint for the last applied session (summer 1511)
        // This will be used to detect the season change
        const footprintsDir = REPO_PATHS.FOOTPRINTS('trails');
        fs.mkdirSync(footprintsDir, { recursive: true });

        // Create rollovers directory (for rollover footprints)
        const rolloversDir = REPO_PATHS.ROLLOVERS();
        fs.mkdirSync(rolloversDir, { recursive: true });

        const summerFootprint = {
          id: 'session-0001_2025-09-20',
          kind: 'session',
          seasonId: '1511-summer',
          appliedAt: '2025-09-20T10:00:00.000Z',
          inputs: { sourceFile: 'session-0001_2025-09-20.jsonl' },
          effects: {
            session: { created: ['o17-p17'], usedFlags: {}, rediscovered: [] },
          },
          touched: { before: {}, after: {} },
        };
        fs.writeFileSync(
          path.join(footprintsDir, 'S-0001_2025-09-20.yaml'),
          yaml.stringify(summerFootprint),
        );

        // --- Create autumn session (season change from summer -> autumn) ---
        const autumnSessionId = 'session-0002_2025-10-15';
        const autumnSessionFile = path.join(
          REPO_PATHS.SESSIONS(),
          `${autumnSessionId}.jsonl`,
        );

        const events = compileLog([
          sessionStart(autumnSessionId, 'O17', '2025-10-15'),
          dayStart({ year: 1511, month: 'Fructara', day: 1 }),
          partySet(party),
          move('O17', 'P17'),
          sessionEnd(autumnSessionId),
        ]);

        fs.writeFileSync(
          autumnSessionFile,
          events.map((e: ScribeEvent) => JSON.stringify(e)).join('\n'),
        );

        // --- Apply autumn session (should trigger automatic rollover) ---
        const { exitCode, stderr } = await runWeave(
          ['apply', 'trails', 'session-0002', '--allow-dirty'],
          { repo },
        );

        expect(exitCode).toBe(0);
        expect(stderr).toBeFalsy();

        // --- Verify automatic rollover was applied ---
        const meta = loadMeta();

        // Autumn 1511 season should NOW be in seasons (added by auto-rollover)
        expect(meta.state.trails.applied?.seasons).toContain('1511-autumn');

        // Verify rollover footprint was created in rollovers directory
        const rolloverFiles = fs.readdirSync(rolloversDir);
        const autoRollFoot = rolloverFiles.find((f) =>
          f.includes('ROLL-1511-autumn'),
        );
        expect(autoRollFoot).toBeTruthy();

        const rollFootprint = yaml.parse(
          fs.readFileSync(path.join(rolloversDir, autoRollFoot!), 'utf8'),
        );
        expect(rollFootprint.kind).toBe('rollover');
        expect(rollFootprint.seasonId).toBe('1511-autumn');
        expect(rollFootprint.inputs.note).toContain('Automatic rollover');
      },
    );
  });
});
