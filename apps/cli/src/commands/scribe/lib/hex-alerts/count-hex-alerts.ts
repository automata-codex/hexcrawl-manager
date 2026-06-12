import { normalizeClueRef } from '@achm/schemas';

import type { HexData } from '@achm/schemas';

/**
 * What a hex holds that the GM should be told about on arrival: clues the
 * party has not learned yet, and pending GM `updates` text.
 */
export interface HexAlerts {
  unknownClues: number;
  updates: number;
}

export function hasAlerts(alerts: HexAlerts): boolean {
  return alerts.unknownClues > 0 || alerts.updates > 0;
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
 * Count a hex's arrival alerts. Pure: clue status resolution is injected so
 * the counting logic is testable without file I/O.
 */
export function countHexAlerts(
  hex: HexData,
  // eslint-disable-next-line no-unused-vars
  isClueUnknown: (clueId: string) => boolean,
): HexAlerts {
  return {
    unknownClues: collectHexClueIds(hex).filter(isClueUnknown).length,
    updates: (hex.updates ?? []).filter((u) => u.trim().length > 0).length,
  };
}
