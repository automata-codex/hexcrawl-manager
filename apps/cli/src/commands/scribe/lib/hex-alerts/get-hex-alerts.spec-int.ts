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
 * Integration coverage for the live-beat surfacing path: real hex YAML + real
 * plotline beat frontmatter on disk, resolved through loadBeats →
 * getLiveBeatIds → collectHexBeatIds → getHexAlerts. The pure unit tests inject
 * the live-beat predicate; this exercises it against actual files and locks the
 * status semantics (pending/active surface; resolved/skipped suppress).
 *
 * Everything lives in one sandbox because getHexAlerts memoizes its beat-status
 * and hex-index lookups per process — a second sandbox would read stale caches.
 */
describe('getHexAlerts (integration: anchored beats)', () => {
  const writeBeat = (slug: string, status: string): void => {
    const dir = path.join(REPO_PATHS.PLOTLINES(), 'pl', 'beats');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `${slug}.md`),
      `---\nslug: ${slug}\ntitle: ${slug}\nplotline: pl\nstatus: ${status}\n---\nBeat body.\n`,
    );
  };

  const writeHex = (id: string, extra: Record<string, unknown>): void => {
    fs.writeFileSync(
      path.join(REPO_PATHS.HEXES(), `${id}.yaml`),
      yaml.stringify({ id, slug: id, name: id, landmark: 'none', ...extra }),
    );
  };

  it('surfaces pending/active beats and suppresses resolved/skipped ones', async () => {
    await withTempRepo(
      'get-hex-alerts-beats',
      { initGit: false },
      async () => {
        writeBeat('live-pending', 'pending');
        writeBeat('live-active', 'active');
        writeBeat('done-resolved', 'resolved');
        writeBeat('done-skipped', 'skipped');

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
        // No beats anchored.
        writeHex('a5', {});

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

        // No anchors, no beat alert.
        expect(getHexAlerts('a5').liveBeats).toBe(0);
      },
    );
  });
});
