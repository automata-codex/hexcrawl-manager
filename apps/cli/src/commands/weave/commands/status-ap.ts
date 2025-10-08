// src/commands/status/lib/status-ap.ts
import { REPO_PATHS } from '@skyreach/data';
import { ApLedgerEntry, ApLedgerEntrySchema } from '@skyreach/schemas';

import { readApLedger } from '../../../services/ap-ledger.service';
import { loadAllCharacters } from '../../../services/characters.service';
import { loadAllSessionReports } from '../../../services/sessions.service';
import { aggregateApByCharacter } from '../lib/aggregate-ap-by-character';
import { computeUnclaimedAbsenceAwards } from '../lib/compute-unclaimed-absence-awards';

export interface StatusApResult {
  apByCharacter: Record<
    string,
    { combat: number; exploration: number; social: number }
  >;
  absenceAwards: Array<{
    displayName: string;
    eligibleMissed: number;
    claimed: number;
    unclaimed: number;
  }>;
}

export async function statusAp(): Promise<StatusApResult> {
  // 1) Read & validate ledger
  const ledgerPath = REPO_PATHS.AP_LEDGER();
  const ledgerEntriesRaw = readApLedger(ledgerPath);

  const ledgerEntries: ApLedgerEntry[] = [];
  for (const entry of ledgerEntriesRaw) {
    const parsed = ApLedgerEntrySchema.safeParse(entry);
    if (parsed.success) ledgerEntries.push(parsed.data);
    else console.warn('Invalid AP ledger entry found and skipped:', parsed.error);
  }

  // 2) Aggregate AP by character/pillar
  const apByCharacter = aggregateApByCharacter(ledgerEntries);

  // 3) Compute unclaimed absence awards
  const characters = loadAllCharacters();
  const sessionReports = loadAllSessionReports();
  const absenceAwards = computeUnclaimedAbsenceAwards(
    sessionReports,
    characters,
    ledgerEntries,
  );

  return { apByCharacter, absenceAwards };
}
