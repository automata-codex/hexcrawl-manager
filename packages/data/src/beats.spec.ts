import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadBeats, parseBeatFile } from './beats.js';
import { clearDataPathCache } from './paths.js';

const beatFile = (front: string, body = 'Beat body text.\n'): string =>
  `---\n${front}\n---\n${body}`;

const VALID_FRONT = [
  'slug: the-refugees-lament',
  'title: The Refugees’ Lament',
  'plotline: istavan-and-the-mask',
  'status: active',
].join('\n');

describe('parseBeatFile', () => {
  it('parses valid frontmatter into BeatData', () => {
    const beat = parseBeatFile(beatFile(VALID_FRONT));
    expect(beat).not.toBeNull();
    expect(beat).toMatchObject({
      slug: 'the-refugees-lament',
      plotline: 'istavan-and-the-mask',
      status: 'active',
    });
  });

  it('defaults status to pending when absent', () => {
    const front = ['slug: quiet-beat', 'title: Quiet', 'plotline: p'].join(
      '\n',
    );
    expect(parseBeatFile(beatFile(front))?.status).toBe('pending');
  });

  it('returns null when the file has no frontmatter fence', () => {
    expect(parseBeatFile('Just body text, no frontmatter.\n')).toBeNull();
  });

  it('returns null for an unterminated frontmatter block', () => {
    expect(parseBeatFile(`---\n${VALID_FRONT}\nno closing fence`)).toBeNull();
  });

  it('returns null for malformed YAML', () => {
    expect(parseBeatFile(beatFile('slug: : : oops\n: bad'))).toBeNull();
  });

  it('returns null when a required field is missing', () => {
    // No `title` — fails BeatSchema.
    const front = ['slug: no-title', 'plotline: p'].join('\n');
    expect(parseBeatFile(beatFile(front))).toBeNull();
  });
});

describe('loadBeats', () => {
  let dataDir: string;
  const originalDataPath = process.env.ACHM_DATA_PATH;

  const writeBeat = (plotline: string, slug: string, front: string): void => {
    const dir = path.join(dataDir, 'plotlines', plotline, 'beats');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${slug}.md`), beatFile(front));
  };

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'achm-beats-'));
    process.env.ACHM_DATA_PATH = dataDir;
    clearDataPathCache();
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
    if (originalDataPath === undefined) {
      delete process.env.ACHM_DATA_PATH;
    } else {
      process.env.ACHM_DATA_PATH = originalDataPath;
    }
    clearDataPathCache();
  });

  it('returns an empty map when the plotlines directory is absent', () => {
    expect(loadBeats().size).toBe(0);
  });

  it('keys beats by canonical plotlineSlug/beatSlug with status', () => {
    writeBeat('istavan-and-the-mask', 'the-refugees-lament', VALID_FRONT);
    writeBeat(
      'milly-and-baz',
      'the-meeting',
      [
        'slug: the-meeting',
        'title: The Meeting',
        'plotline: milly-and-baz',
      ].join('\n'),
    );

    const beats = loadBeats();
    expect([...beats.keys()].sort()).toEqual([
      'istavan-and-the-mask/the-refugees-lament',
      'milly-and-baz/the-meeting',
    ]);
    expect(beats.get('istavan-and-the-mask/the-refugees-lament')?.status).toBe(
      'active',
    );
    expect(beats.get('milly-and-baz/the-meeting')?.status).toBe('pending');
  });

  it('ignores Markdown outside a beats/ directory (e.g. the plotline page)', () => {
    const plotlineDir = path.join(dataDir, 'plotlines', 'istavan-and-the-mask');
    fs.mkdirSync(plotlineDir, { recursive: true });
    fs.writeFileSync(
      path.join(plotlineDir, 'istavan-and-the-mask.md'),
      beatFile(VALID_FRONT),
    );

    expect(loadBeats().size).toBe(0);
  });

  it('skips malformed beat files but keeps valid siblings', () => {
    writeBeat(
      'p',
      'good',
      ['slug: good', 'title: Good', 'plotline: p'].join('\n'),
    );
    writeBeat('p', 'bad', 'slug: : : oops\n: bad');

    const beats = loadBeats();
    expect([...beats.keys()]).toEqual(['p/good']);
  });
});
