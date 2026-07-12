import { describe, expect, it } from 'vitest';

import {
  collectHexBeatIds,
  collectHexClueIds,
  collectHexRoleplayBookIds,
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

describe('collectHexBeatIds', () => {
  it('collects beats from the landmark and hidden sites, deduped', () => {
    const hex = baseHex({
      landmark: {
        description: 'ruin',
        beats: ['plot/from-landmark', 'plot/shared'],
      },
      hiddenSites: [
        { description: 'scar', beats: ['plot/from-site', 'plot/shared'] },
      ],
    });
    expect(collectHexBeatIds(hex).sort()).toEqual([
      'plot/from-landmark',
      'plot/from-site',
      'plot/shared',
    ]);
  });

  it('returns empty for a bare hex with a string landmark', () => {
    expect(collectHexBeatIds(baseHex())).toEqual([]);
  });
});

describe('collectHexRoleplayBookIds', () => {
  it('collects books from the landmark and hidden sites, deduped', () => {
    const hex = baseHex({
      landmark: {
        description: 'fort',
        roleplayBooks: ['fort-dagaric', 'shared-book'],
      },
      hiddenSites: [
        { description: 'cave', roleplayBooks: ['cave-book', 'shared-book'] },
      ],
    });
    expect(collectHexRoleplayBookIds(hex).sort()).toEqual([
      'cave-book',
      'fort-dagaric',
      'shared-book',
    ]);
  });

  it('returns empty for a bare hex with a string landmark', () => {
    expect(collectHexRoleplayBookIds(baseHex())).toEqual([]);
  });
});

describe('countHexAlerts', () => {
  it('counts only clues the resolver reports as unknown', () => {
    const hex = baseHex({
      hiddenSites: [
        { description: 's', clues: ['known-clue', 'unknown-clue'] },
      ],
    });
    const alerts = countHexAlerts(
      hex,
      (id) => id === 'unknown-clue',
      () => false,
      () => undefined,
    );
    expect(alerts).toEqual({
      unknownClues: 1,
      liveBeats: 0,
      roleplayBooks: [],
      updates: 0,
    });
  });

  it('counts only beats the resolver reports as live', () => {
    const hex = baseHex({
      landmark: { description: 'ruin', beats: ['plot/live', 'plot/done'] },
    });
    const alerts = countHexAlerts(
      hex,
      () => false,
      (id) => id === 'plot/live',
      () => undefined,
    );
    expect(alerts).toEqual({
      unknownClues: 0,
      liveBeats: 1,
      roleplayBooks: [],
      updates: 0,
    });
  });

  it('lists only the books the resolver maps to a title, by title', () => {
    const hex = baseHex({
      landmark: {
        description: 'fort',
        roleplayBooks: ['fort-dagaric', 'missing-book'],
      },
    });
    const alerts = countHexAlerts(
      hex,
      () => false,
      () => false,
      (id) => (id === 'fort-dagaric' ? 'Fort Dagaric' : undefined),
    );
    expect(alerts).toEqual({
      unknownClues: 0,
      liveBeats: 0,
      roleplayBooks: ['Fort Dagaric'],
      updates: 0,
    });
  });

  it('counts non-blank updates entries', () => {
    const hex = baseHex({ updates: ['Scar activity doubled', '  ', ''] });
    expect(
      countHexAlerts(
        hex,
        () => false,
        () => false,
        () => undefined,
      ),
    ).toEqual({
      unknownClues: 0,
      liveBeats: 0,
      roleplayBooks: [],
      updates: 1,
    });
  });
});

describe('hasAlerts', () => {
  it('is true when any count is positive or a book is listed', () => {
    expect(
      hasAlerts({
        unknownClues: 1,
        liveBeats: 0,
        roleplayBooks: [],
        updates: 0,
      }),
    ).toBe(true);
    expect(
      hasAlerts({
        unknownClues: 0,
        liveBeats: 1,
        roleplayBooks: [],
        updates: 0,
      }),
    ).toBe(true);
    expect(
      hasAlerts({
        unknownClues: 0,
        liveBeats: 0,
        roleplayBooks: ['Fort Dagaric'],
        updates: 0,
      }),
    ).toBe(true);
    expect(
      hasAlerts({
        unknownClues: 0,
        liveBeats: 0,
        roleplayBooks: [],
        updates: 2,
      }),
    ).toBe(true);
    expect(
      hasAlerts({
        unknownClues: 0,
        liveBeats: 0,
        roleplayBooks: [],
        updates: 0,
      }),
    ).toBe(false);
  });
});

describe('formatHexAlertLines', () => {
  it('emits one line per alert kind, with beats and books labeled separately', () => {
    expect(
      formatHexAlertLines('E7', {
        unknownClues: 2,
        liveBeats: 3,
        roleplayBooks: ['Fort Dagaric'],
        updates: 1,
      }),
    ).toEqual([
      '🔍 2 unknown clue(s) here — see hex E7.',
      '🎭 3 live beat(s) anchored here — see hex E7.',
      '📖 Roleplay book(s) relevant here: Fort Dagaric — see hex E7.',
      '📝 This hex has 1 GM update(s).',
    ]);
  });

  it('names every linked book, comma-separated', () => {
    expect(
      formatHexAlertLines('J7', {
        unknownClues: 0,
        liveBeats: 0,
        roleplayBooks: ['Fort Dagaric', 'Dragonborn Diaspora'],
        updates: 0,
      }),
    ).toEqual([
      '📖 Roleplay book(s) relevant here: Fort Dagaric, Dragonborn Diaspora — see hex J7.',
    ]);
  });

  it('emits only the beat line when a hex has live beats but no clues', () => {
    expect(
      formatHexAlertLines('J7', {
        unknownClues: 0,
        liveBeats: 1,
        roleplayBooks: [],
        updates: 0,
      }),
    ).toEqual(['🎭 1 live beat(s) anchored here — see hex J7.']);
  });

  it('emits nothing when there are no alerts', () => {
    expect(
      formatHexAlertLines('E7', {
        unknownClues: 0,
        liveBeats: 0,
        roleplayBooks: [],
        updates: 0,
      }),
    ).toEqual([]);
  });
});

describe('makeHexAlertNote', () => {
  it('mentions only the alert kinds that are present', () => {
    expect(
      makeHexAlertNote('E7', {
        unknownClues: 2,
        liveBeats: 0,
        roleplayBooks: [],
        updates: 0,
      }),
    ).toBe('Hex alert at E7: 2 unknown clue(s) — see hex E7.');
    expect(
      makeHexAlertNote('E7', {
        unknownClues: 2,
        liveBeats: 1,
        roleplayBooks: ['Fort Dagaric'],
        updates: 1,
      }),
    ).toBe(
      'Hex alert at E7: 2 unknown clue(s), 1 live beat(s), 1 roleplay book(s), 1 GM update(s) — see hex E7.',
    );
  });

  it('counts books in the note (the interactive line names them)', () => {
    expect(
      makeHexAlertNote('V17', {
        unknownClues: 0,
        liveBeats: 0,
        roleplayBooks: ['Fort Dagaric'],
        updates: 0,
      }),
    ).toBe('Hex alert at V17: 1 roleplay book(s) — see hex V17.');
  });

  it('reads cleanly when a live beat is the only alert', () => {
    expect(
      makeHexAlertNote('J7', {
        unknownClues: 0,
        liveBeats: 1,
        roleplayBooks: [],
        updates: 0,
      }),
    ).toBe('Hex alert at J7: 1 live beat(s) — see hex J7.');
  });
});
