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

  // 2) Load characters and filter inactive ones
  const allCharacters = loadAllCharacters();
  const activeCharacters = allCharacters.filter(c => !c.lifecycle?.retiredAt);
  const activeCharacterIds = new Set(activeCharacters.map(c => c.id));

  // 3) Aggregate AP by character/pillar, then filter to active characters only
  const allApByCharacter = aggregateApByCharacter(ledgerEntries);
  const apByCharacter = Object.fromEntries(
    Object.entries(allApByCharacter).filter(([charId]) => activeCharacterIds.has(charId))
  );

  // 4) Compute unclaimed absence awards
  const sessionReports = loadAllSessionReports();
  const absenceAwards = computeUnclaimedAbsenceAwards(
    sessionReports,
    activeCharacters,
    ledgerEntries,
  );

  return { apByCharacter, absenceAwards };
}
