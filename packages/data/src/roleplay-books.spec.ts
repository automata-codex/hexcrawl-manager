import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearDataPathCache } from './paths.js';
import { loadRoleplayBooks, parseRoleplayBookFile } from './roleplay-books.js';

const bookYaml = (overrides: Record<string, string> = {}): string => {
  const fields: Record<string, string> = {
    name: 'Fort Dagaric',
    keyword: 'fort-dagaric',
    culturalOverview: 'A frontier outpost full of rumor and grain.',
    rpVoiceNotes: '\n  - Gruff, clipped sentences.',
    loreHooks: '\n  - The grain ledgers do not add up.',
    sampleDialogue: '\n  - "You here about the export inquiries?"',
    ...overrides,
  };
  return Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
};

describe('parseRoleplayBookFile', () => {
  it('parses valid YAML into RoleplayBookData', () => {
    const book = parseRoleplayBookFile(bookYaml());
    expect(book).not.toBeNull();
    expect(book).toMatchObject({
      name: 'Fort Dagaric',
      keyword: 'fort-dagaric',
    });
  });

  it('returns null for malformed YAML', () => {
    expect(parseRoleplayBookFile('name: : : oops\n: bad')).toBeNull();
  });

  it('returns null when a required field is missing', () => {
    // No `name` — fails RoleplayBookSchema.
    expect(
      parseRoleplayBookFile(bookYaml({ name: '' }).replace(/^name:.*\n/, '')),
    ).toBeNull();
  });
});

describe('loadRoleplayBooks', () => {
  let dataDir: string;
  const originalDataPath = process.env.ACHM_DATA_PATH;

  const writeBook = (slug: string, contents: string): void => {
    const dir = path.join(dataDir, 'roleplay-books');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${slug}.yml`), contents);
  };

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'achm-books-'));
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

  it('returns an empty map when the roleplay-books directory is absent', () => {
    expect(loadRoleplayBooks().size).toBe(0);
  });

  it('keys books by file slug with their display name', () => {
    writeBook('fort-dagaric', bookYaml());
    writeBook('bearfolk', bookYaml({ name: 'Bearfolk', keyword: 'bearfolk' }));

    const books = loadRoleplayBooks();
    expect([...books.keys()].sort()).toEqual(['bearfolk', 'fort-dagaric']);
    expect(books.get('fort-dagaric')?.name).toBe('Fort Dagaric');
    expect(books.get('bearfolk')?.name).toBe('Bearfolk');
  });

  it('skips malformed book files but keeps valid siblings', () => {
    writeBook('good', bookYaml());
    writeBook('bad', 'name: : : oops\n: bad');

    expect([...loadRoleplayBooks().keys()]).toEqual(['good']);
  });
});
