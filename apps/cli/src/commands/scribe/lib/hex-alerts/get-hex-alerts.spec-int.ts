import { REPO_PATHS } from '@achm/data';
import { withTempRepo } from '@achm/test-helpers';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import yaml from 'yaml';

import { hasAlerts } from './count-hex-alerts';
import { formatHexAlertLines } from './format-hex-alerts';
import { getHexAlerts } from './get-hex-alerts';

/**
 * Integration coverage for the anchored-content surfacing path: real hex YAML,
 * real plotline beat frontmatter, and real roleplay-book YAML on disk, resolved
 * through loadBeats / loadRoleplayBooks → getHexAlerts. The pure unit tests
 * inject the resolvers; this exercises them against actual files and locks the
 * semantics (beats: pending/active surface, resolved/skipped suppress; books:
 * always surface by title, dangling links drop).
 *
 * Everything lives in one sandbox because getHexAlerts memoizes its beat-status,
 * book-title, and hex-index lookups per process — a second sandbox would read
 * stale caches.
 */
describe('getHexAlerts (integration: anchored beats and roleplay books)', () => {
  const writeBeat = (slug: string, status: string): void => {
    const dir = path.join(REPO_PATHS.PLOTLINES(), 'pl', 'beats');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `${slug}.md`),
      `---\nslug: ${slug}\ntitle: ${slug}\nplotline: pl\nstatus: ${status}\n---\nBeat body.\n`,
    );
  };

  const writeRoleplayBook = (slug: string, name: string): void => {
    fs.mkdirSync(REPO_PATHS.ROLEPLAY_BOOKS(), { recursive: true });
    fs.writeFileSync(
      path.join(REPO_PATHS.ROLEPLAY_BOOKS(), `${slug}.yml`),
      yaml.stringify({
        name,
        keyword: slug,
        culturalOverview: 'Overview.',
        rpVoiceNotes: ['Note.'],
        loreHooks: ['Hook.'],
        sampleDialogue: ['Line.'],
      }),
    );
  };

  const writeHex = (id: string, extra: Record<string, unknown>): void => {
    fs.writeFileSync(
      path.join(REPO_PATHS.HEXES(), `${id}.yaml`),
      yaml.stringify({ id, slug: id, name: id, landmark: 'none', ...extra }),
    );
  };

  it('surfaces live beats and linked roleplay books, suppressing terminal/dangling ones', async () => {
    await withTempRepo(
      'get-hex-alerts-anchors',
      { initGit: false },
      async () => {
        writeBeat('live-pending', 'pending');
        writeBeat('live-active', 'active');
        writeBeat('done-resolved', 'resolved');
        writeBeat('done-skipped', 'skipped');
        writeRoleplayBook('fort-dagaric', 'Fort Dagaric');

        // Landmark anchor, live.
        writeHex('a1', {
          landmark: { description: 'ruin', beats: ['pl/live-pending'] },
        });
        // Landmark anchor, terminal — must not surface.
        writeHex('a2', {
          landmark: { description: 'ruin', beats: ['pl/done-resolved'] },
        });
        // Hidden-site anchor, live.
        writeHex('a3', {
          hiddenSites: [{ description: 'cave', beats: ['pl/live-active'] }],
        });
        // Landmark anchor, skipped — must not surface.
        writeHex('a4', {
          landmark: { description: 'ruin', beats: ['pl/done-skipped'] },
        });
        // No anchors at all.
        writeHex('a5', {});
        // Landmark roleplay-book link, resolves to a real book.
        writeHex('a6', {
          landmark: { description: 'fort', roleplayBooks: ['fort-dagaric'] },
        });
        // Dangling roleplay-book link — resolves to nothing.
        writeHex('a7', {
          landmark: { description: 'ruin', roleplayBooks: ['ghost'] },
        });

        // A pending beat on the landmark surfaces and would pause fast travel.
        const a1 = getHexAlerts('a1');
        expect(a1.liveBeats).toBe(1);
        expect(hasAlerts(a1)).toBe(true);
        expect(formatHexAlertLines('a1', a1)).toContain(
          '🎭 1 live beat(s) anchored here — see hex a1.',
        );

        // A resolved beat is the hex's only content: nothing surfaces, so fast
        // travel would not pause here.
        const a2 = getHexAlerts('a2');
        expect(a2.liveBeats).toBe(0);
        expect(hasAlerts(a2)).toBe(false);

        // An active beat anchored on a hidden site also surfaces.
        expect(getHexAlerts('a3').liveBeats).toBe(1);

        // Skipped is terminal — suppressed like resolved.
        expect(getHexAlerts('a4').liveBeats).toBe(0);

        // No anchors, no alert.
        expect(hasAlerts(getHexAlerts('a5'))).toBe(false);

        // A linked book surfaces by title (no status gate) and would pause.
        const a6 = getHexAlerts('a6');
        expect(a6.roleplayBooks).toEqual(['Fort Dagaric']);
        expect(hasAlerts(a6)).toBe(true);
        expect(formatHexAlertLines('a6', a6)).toContain(
          '📖 Roleplay book(s) relevant here: Fort Dagaric — see hex a6.',
        );

        // A link to a non-existent book resolves to nothing and does not surface.
        const a7 = getHexAlerts('a7');
        expect(a7.roleplayBooks).toEqual([]);
        expect(hasAlerts(a7)).toBe(false);
      },
    );
  });
});
