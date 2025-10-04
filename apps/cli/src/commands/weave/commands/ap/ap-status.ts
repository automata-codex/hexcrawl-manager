import { REPO_PATHS } from '@skyreach/data';
import { ApLedgerEntry, ApLedgerEntrySchema } from '@skyreach/schemas';

import { readApLedger } from '../../../../services/ap-ledger.service';
import { aggregateApByCharacter } from '../../lib/aggregate-ap-by-character';

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

