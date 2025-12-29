import { ApLedgerEntry } from '@achm/schemas';

export type AggregatedAp = Record<
  string,
  { combat: number; exploration: number; social: number }
>;

/**
 * Aggregates AP by character and pillar from the AP ledger entries.
 * Returns a map: characterId -> { combat, exploration, social }
 */
export function aggregateApByCharacter(
  ledgerEntries: ApLedgerEntry[],
): AggregatedAp {
  const result: AggregatedAp = {};
  for (const entry of ledgerEntries) {
    const { characterId } = entry;
    if (!characterId) continue;
    if (!result[characterId]) {
      result[characterId] = { combat: 0, exploration: 0, social: 0 };
    }
    if (entry.kind === 'session_ap' || entry.kind === 'absence_spend' || entry.kind === 'milestone_spend') {
      result[characterId].combat += entry.advancementPoints.combat?.delta ?? 0;
      result[characterId].exploration +=
        entry.advancementPoints.exploration?.delta ?? 0;
      result[characterId].social += entry.advancementPoints.social?.delta ?? 0;
    }
  }
  return result;
}
