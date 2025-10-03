import { REPO_PATHS } from '@skyreach/data';
import { ApLedgerEntry, ApLedgerEntrySchema } from '@skyreach/schemas';

import { readApLedger } from '../../../../services/ap-ledger.service';

// Command handler for `weave ap status`
export async function apStatus() {
  // Step 1: Get the AP ledger file path
  const ledgerPath = REPO_PATHS.AP_LEDGER();

  // Step 2: Read and parse the AP ledger file
  const ledgerEntriesRaw = readApLedger(ledgerPath);

  // Validate each entry using the schema
  const ledgerEntries: ApLedgerEntry[] = [];
  for (const entry of ledgerEntriesRaw) {
    const parsed = ApLedgerEntrySchema.safeParse(entry);
    if (parsed.success) {
      ledgerEntries.push(parsed.data);
    } else {
      // Optionally, handle or log validation errors
      console.warn('Invalid AP ledger entry found and skipped:', parsed.error);
    }
  }

  // Step 3: Aggregate AP by character and pillar
  const apByCharacter = aggregateApByCharacter(ledgerEntries);

  // Step 4: Print a summary table
  console.log('AP Status by Character (as of October 2, 2025):');
  console.log('-------------------------------------------------');
  console.log('Character ID      Combat   Exploration   Social');
  console.log('-------------------------------------------------');
  for (const [characterId, ap] of Object.entries(apByCharacter)) {
    const pad = (s: string, n: number) => s.padEnd(n, ' ');
    console.log(
      `${pad(characterId, 16)}${pad(ap.combat.toString(), 9)}${pad(ap.exploration.toString(), 14)}${pad(ap.social.toString(), 7)}`
    );
  }
  console.log('-------------------------------------------------');
}

/**
 * Aggregates AP by character and pillar from the AP ledger entries.
 * Returns a map: characterId -> { combat, exploration, social }
 */
export function aggregateApByCharacter(ledgerEntries: ApLedgerEntry[]): Record<string, { combat: number; exploration: number; social: number }> {
  const result: Record<string, { combat: number; exploration: number; social: number }> = {};
  for (const entry of ledgerEntries) {
    const { characterId } = entry;
    if (!characterId) continue;
    if (!result[characterId]) {
      result[characterId] = { combat: 0, exploration: 0, social: 0 };
    }
    if (entry.kind === 'session_ap' || entry.kind === 'absence_spend') {
      result[characterId].combat += entry.advancementPoints.combat?.delta ?? 0;
      result[characterId].exploration += entry.advancementPoints.exploration?.delta ?? 0;
      result[characterId].social += entry.advancementPoints.social?.delta ?? 0;
    }
  }
  return result;
}
