import { REPO_PATHS, readAndValidateYaml } from '@achm/data';
import { ClueSchema } from '@achm/schemas';
import fs from 'fs';
import path from 'path';

import { loadHexData } from '../hex-data';

import { countHexAlerts, type HexAlerts } from './count-hex-alerts';

// Lazy-initialized clue status cache (clue id → is the clue still unknown).
// Loaded once per process: clue status only changes via data-repo edits,
// which don't happen mid-session.
let unknownClueIds: Set<string> | null = null;

function getUnknownClueIds(): Set<string> {
  if (unknownClueIds) {
    return unknownClueIds;
  }
  unknownClueIds = new Set();
  const cluesDir = REPO_PATHS.CLUES();
  if (!fs.existsSync(cluesDir)) {
    return unknownClueIds;
  }
  for (const file of fs.readdirSync(cluesDir)) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) {
      continue;
    }
    try {
      const clue = readAndValidateYaml(path.join(cluesDir, file), ClueSchema);
      if (clue.status === 'unknown' && clue.campaignStatus === 'active') {
        unknownClueIds.add(clue.id);
      }
    } catch {
      // Invalid clue files are a data problem for the validators, not for
      // in-session play — skip them here.
    }
  }
  return unknownClueIds;
}

/**
 * A hex's arrival alerts: clues the party hasn't learned yet (referenced by
 * the hex's landmark, hidden sites, or GM dream-notes) and pending GM
 * `updates` entries. Returns zero alerts for unknown/unloadable hexes.
 *
 * Read-only: displaying an alert never changes clue status or clears
 * `updates` — the GM does that in the data repo once the content lands.
 */
export function getHexAlerts(hexId: string): HexAlerts {
  const hex = loadHexData(hexId);
  if (!hex) {
    return { unknownClues: 0, updates: 0 };
  }
  const unknown = getUnknownClueIds();
  return countHexAlerts(hex, (clueId) => unknown.has(clueId));
}
