import {
  REPO_PATHS,
  loadBeats,
  loadRoleplayBooks,
  readAndValidateYaml,
} from '@achm/data';
import { ClueSchema } from '@achm/schemas';
import fs from 'fs';
import path from 'path';

import { loadHexData } from '../hex-data';

import { countHexAlerts, type HexAlerts } from './count-hex-alerts';

// Beat statuses that count as "live" — anchored content the party can still
// walk into. Resolved/skipped beats are terminal and must not surface.
const LIVE_BEAT_STATUSES = new Set(['pending', 'active']);

// Lazy-initialized clue status cache (clue id → is the clue still unknown).
// Loaded once per process: clue status only changes via data-repo edits,
// which don't happen mid-session.
let unknownClueIds: Set<string> | null = null;

// Lazy-initialized live-beat cache (canonical beat id → is the beat live).
// Like clue status, beat status only changes via data-repo edits, so load once.
let liveBeatIds: Set<string> | null = null;

// Lazy-initialized roleplay-book title cache (book slug → display title).
// Books carry no status gate — every linked book is always relevant — so this
// is a flat slug→title lookup, no filtering. Loaded once per process.
let roleplayBookTitles: Map<string, string> | null = null;

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

function getLiveBeatIds(): Set<string> {
  if (liveBeatIds) {
    return liveBeatIds;
  }
  liveBeatIds = new Set();
  for (const [id, beat] of loadBeats()) {
    if (
      LIVE_BEAT_STATUSES.has(beat.status) &&
      beat.campaignStatus === 'active'
    ) {
      liveBeatIds.add(id);
    }
  }
  return liveBeatIds;
}

function getRoleplayBookTitles(): Map<string, string> {
  if (roleplayBookTitles) {
    return roleplayBookTitles;
  }
  roleplayBookTitles = new Map();
  for (const [slug, book] of loadRoleplayBooks()) {
    roleplayBookTitles.set(slug, book.name);
  }
  return roleplayBookTitles;
}

/**
 * A hex's arrival alerts: clues the party hasn't learned yet (referenced by
 * the hex's landmark, hidden sites, or GM dream-notes), live beats anchored to
 * the hex's landmark or hidden sites, roleplay books reminded at those features,
 * and pending GM `updates` entries. Returns zero alerts for unknown/unloadable
 * hexes.
 *
 * Read-only: displaying an alert never changes clue or beat status nor clears
 * `updates` — the GM does that in the data repo once the content lands.
 */
export function getHexAlerts(hexId: string): HexAlerts {
  const hex = loadHexData(hexId);
  if (!hex) {
    return { unknownClues: 0, liveBeats: 0, roleplayBooks: [], updates: 0 };
  }
  const unknown = getUnknownClueIds();
  const live = getLiveBeatIds();
  const bookTitles = getRoleplayBookTitles();
  return countHexAlerts(
    hex,
    (clueId) => unknown.has(clueId),
    (beatId) => live.has(beatId),
    (bookId) => bookTitles.get(bookId),
  );
}
