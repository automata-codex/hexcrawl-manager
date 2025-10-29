import { warn } from '@skyreach/cli-kit';
import {
  aggregateApByCharacter,
  readApLedger,
  REPO_PATHS,
} from '@skyreach/data';
import { ApLedgerEntry, ApLedgerEntrySchema } from '@skyreach/schemas';

import { loadAllCharacters } from '../../../services/characters.service';
import { loadAllSessionReports } from '../../../services/sessions.service';
import { computeUnclaimedAbsenceAwards } from '../lib/core/compute-unclaimed-absence-awards';

export interface StatusApResult {
  apByCharacter: Record<
    string,
    { combat: number; exploration: number; social: number }
  >;
  absenceAwards: Array<{
    characterId: string;
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
    if (parsed.success) {
      ledgerEntries.push(parsed.data);
    } else {
      warn(`Invalid AP ledger entry found and skipped: ${parsed.error}`);
    }
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
