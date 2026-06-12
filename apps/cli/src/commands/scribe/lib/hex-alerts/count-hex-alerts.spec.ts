import { describe, expect, it } from 'vitest';

import {
  collectHexClueIds,
  countHexAlerts,
  hasAlerts,
} from './count-hex-alerts';
import { formatHexAlertLines, makeHexAlertNote } from './format-hex-alerts';

import type { HexData } from '@achm/schemas';

const baseHex = (overrides: Partial<HexData> = {}): HexData => ({
  id: 'e7',
  slug: 'e7',
  name: 'none',
  landmark: 'none',
  ...overrides,
});

describe('collectHexClueIds', () => {
  it('collects clues from hidden sites, landmark, and dream-notes, deduped', () => {
    const hex = baseHex({
      landmark: { description: 'ruin', clues: ['from-landmark', 'shared'] },
      hiddenSites: [
        {
          description: 'scar',
          clues: ['from-site', { id: 'shared', context: 'again' }],
        },
      ],
      notes: [
        'plain string note',
        { description: 'dream', clueId: 'from-dream' },
      ],
    });
    expect(collectHexClueIds(hex).sort()).toEqual([
      'from-dream',
      'from-landmark',
      'from-site',
      'shared',
    ]);
  });

  it('returns empty for a bare hex with a string landmark', () => {
    expect(collectHexClueIds(baseHex())).toEqual([]);
  });
});

describe('countHexAlerts', () => {
  it('counts only clues the resolver reports as unknown', () => {
    const hex = baseHex({
      hiddenSites: [
        { description: 's', clues: ['known-clue', 'unknown-clue'] },
      ],
    });
    const alerts = countHexAlerts(hex, (id) => id === 'unknown-clue');
    expect(alerts).toEqual({ unknownClues: 1, updates: 0 });
  });

  it('counts non-blank updates entries', () => {
    const hex = baseHex({ updates: ['Scar activity doubled', '  ', ''] });
    expect(countHexAlerts(hex, () => false)).toEqual({
      unknownClues: 0,
      updates: 1,
    });
  });
});

describe('hasAlerts', () => {
  it('is true when either count is positive', () => {
    expect(hasAlerts({ unknownClues: 1, updates: 0 })).toBe(true);
    expect(hasAlerts({ unknownClues: 0, updates: 2 })).toBe(true);
    expect(hasAlerts({ unknownClues: 0, updates: 0 })).toBe(false);
  });
});

describe('formatHexAlertLines', () => {
  it('emits one line per alert kind, count-only', () => {
    expect(formatHexAlertLines('E7', { unknownClues: 2, updates: 1 })).toEqual([
      '🔍 2 unknown clue(s) here — see hex E7.',
      '📝 This hex has 1 GM update(s).',
    ]);
  });

  it('emits nothing when there are no alerts', () => {
    expect(formatHexAlertLines('E7', { unknownClues: 0, updates: 0 })).toEqual(
      [],
    );
  });
});

describe('makeHexAlertNote', () => {
  it('mentions only the alert kinds that are present', () => {
    expect(makeHexAlertNote('E7', { unknownClues: 2, updates: 0 })).toBe(
      'Hex alert at E7: 2 unknown clue(s) — see hex E7.',
    );
    expect(makeHexAlertNote('E7', { unknownClues: 2, updates: 1 })).toBe(
      'Hex alert at E7: 2 unknown clue(s), 1 GM update(s) — see hex E7.',
    );
  });
});
