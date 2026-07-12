import { normalizeClueRef } from '@achm/schemas';

import type { HexData } from '@achm/schemas';

/**
 * What a hex holds that the GM should be told about on arrival: clues the
 * party has not learned yet, live beats anchored here that have not resolved,
 * roleplay books reminded here (by title), and pending GM `updates` text.
 */
export interface HexAlerts {
  unknownClues: number;
  liveBeats: number;
  /**
   * Display titles of the roleplay books reminded at this hex. Books carry no
   * status gate, so every linked-and-resolvable book is listed — the title is
   * the pointer the GM acts on, which is why this is titles rather than a count.
   */
  roleplayBooks: string[];
  updates: number;
}

export function hasAlerts(alerts: HexAlerts): boolean {
  return (
    alerts.unknownClues > 0 ||
    alerts.liveBeats > 0 ||
    alerts.roleplayBooks.length > 0 ||
    alerts.updates > 0
  );
}

/**
 * Collect every clue id referenced by a hex: landmark clues, hidden-site
 * clues, and GM-note dream-clues. Deduped.
 */
export function collectHexClueIds(hex: HexData): string[] {
  const ids = new Set<string>();
  if (typeof hex.landmark === 'object') {
    for (const ref of hex.landmark.clues ?? []) {
      ids.add(normalizeClueRef(ref).id);
    }
  }
  for (const site of hex.hiddenSites ?? []) {
    // Legacy hidden-site format is a bare description string — no clues.
    if (typeof site !== 'object') continue;
    for (const ref of site.clues ?? []) {
      ids.add(normalizeClueRef(ref).id);
    }
  }
  for (const note of hex.notes ?? []) {
    if (typeof note === 'object' && note.clueId) {
      ids.add(note.clueId);
    }
  }
  return [...ids];
}

/**
 * Collect every beat id anchored on a hex: landmark beats and hidden-site
 * beats. Beat ids are already canonical `plotlineSlug/beatSlug` references, so
 * (unlike clues) they need no normalization. Deduped.
 */
export function collectHexBeatIds(hex: HexData): string[] {
  const ids = new Set<string>();
  if (typeof hex.landmark === 'object') {
    for (const id of hex.landmark.beats ?? []) {
      ids.add(id);
    }
  }
  for (const site of hex.hiddenSites ?? []) {
    // Legacy hidden-site format is a bare description string — no beats.
    if (typeof site !== 'object') continue;
    for (const id of site.beats ?? []) {
      ids.add(id);
    }
  }
  return [...ids];
}

/**
 * Collect every roleplay-book slug reminded at a hex: landmark books and
 * hidden-site books. Slugs are the `data/roleplay-books/<slug>.yml` filenames,
 * so (unlike clues) they need no normalization. Deduped.
 */
export function collectHexRoleplayBookIds(hex: HexData): string[] {
  const ids = new Set<string>();
  if (typeof hex.landmark === 'object') {
    for (const id of hex.landmark.roleplayBooks ?? []) {
      ids.add(id);
    }
  }
  for (const site of hex.hiddenSites ?? []) {
    // Legacy hidden-site format is a bare description string — no books.
    if (typeof site !== 'object') continue;
    for (const id of site.roleplayBooks ?? []) {
      ids.add(id);
    }
  }
  return [...ids];
}

/**
 * Count a hex's arrival alerts. Pure: clue/beat status and book-title
 * resolution are injected so the counting logic is testable without file I/O.
 * `roleplayBookTitle` returns the book's display title, or undefined for a slug
 * that resolves to no book (dangling links are dropped rather than surfaced).
 */
export function countHexAlerts(
  hex: HexData,
  // eslint-disable-next-line no-unused-vars
  isClueUnknown: (clueId: string) => boolean,
  // eslint-disable-next-line no-unused-vars
  isBeatLive: (beatId: string) => boolean,
  // eslint-disable-next-line no-unused-vars
  roleplayBookTitle: (bookId: string) => string | undefined,
): HexAlerts {
  return {
    unknownClues: collectHexClueIds(hex).filter(isClueUnknown).length,
    liveBeats: collectHexBeatIds(hex).filter(isBeatLive).length,
    roleplayBooks: collectHexRoleplayBookIds(hex)
      .map(roleplayBookTitle)
      .filter((title): title is string => title !== undefined),
    updates: (hex.updates ?? []).filter((u) => u.trim().length > 0).length,
  };
}
