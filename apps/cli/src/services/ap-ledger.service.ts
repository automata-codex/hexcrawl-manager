import { readJsonl, writeJsonl, appendJsonl } from '@skyreach/data';
import { ApDelta, ApLedgerEntry } from '@skyreach/schemas';

// --- Types ---

export type LedgerResultsByCharacter = Record<
  string,
  {
    exploration: ApDelta;
    social: ApDelta;
    combat: ApDelta;
  }
>;

// --- I/O ---

export function readApLedger(filePath: string): ApLedgerEntry[] {
  return readJsonl<ApLedgerEntry>(filePath);
}

export function rewriteApLedger(
  filePath: string,
  entries: Iterable<ApLedgerEntry>,
): void {
  writeJsonl<ApLedgerEntry>(filePath, entries);
}

export function appendApEntry(filePath: string, entry: ApLedgerEntry): void {
  appendJsonl<ApLedgerEntry>(filePath, entry);
}

export function appendApEntries(
  filePath: string,
  entries: Iterable<ApLedgerEntry>,
): void {
  // simple loop keeps generic layer tiny
  for (const e of entries) appendApEntry(filePath, e);
}

// --- Helpers ---

/**
 * Convert `ledgerResults` from `computeApForSession` into JSONL entries.
 */
export function buildSessionApEntries(
  ledgerResults: LedgerResultsByCharacter,
  {
    appliedAt,
    sessionId,
    fingerprint,
  }: { appliedAt: string; sessionId: string; fingerprint: string },
): ApLedgerEntry[] {
  const entries: ApLedgerEntry[] = [];
  for (const characterId of Object.keys(ledgerResults)) {
    const ap = ledgerResults[characterId];
    entries.push({
      kind: 'session_ap',
      advancementPoints: {
        combat: { delta: ap.combat.delta, reason: ap.combat.reason },
        exploration: {
          delta: ap.exploration.delta,
          reason: ap.exploration.reason,
        },
        social: { delta: ap.social.delta, reason: ap.social.reason },
      },
      appliedAt,
      characterId,
      sessionId,
      source: { fileHash: fingerprint },
    });
  }
  return entries;
}
