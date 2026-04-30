import type {
  ApLedgerEntry,
  CharacterData,
  SessionReport,
} from '@achm/schemas';

export type UnclaimedMilestoneSummary = {
  characterId: string;
  displayName: string;
  eligible: number;
  claimed: number;
  unclaimed: number;
};

/**
 * Compute per-character milestone-award counts.
 *
 * Eligibility rule (per `docs/specs/milestone-ap-reconciliation.md`):
 * - A character is eligible for a milestone iff they appear in the
 *   completed session's final attendance roster (`characterIds` of the report)
 *   AND a milestone event was declared in that session.
 * - The number of milestone events per session is supplied via
 *   `milestoneCountsBySessionId`; the caller (status-ap) collects it from
 *   the JSONL log + legacy `todo`-with-prefix entries on the report.
 *
 * Claimed = number of `milestone_spend` ledger entries for the character.
 * Unclaimed = max(0, eligible - claimed).
 */
export function computeUnclaimedMilestoneAwards(
  sessions: SessionReport[],
  characters: CharacterData[],
  apLedger: ApLedgerEntry[],
  milestoneCountsBySessionId: Map<string, number>,
): UnclaimedMilestoneSummary[] {
  // Per-character eligibility: sum of milestone counts for sessions they attended
  const eligibleByChar = new Map<string, number>();
  for (const session of sessions) {
    if (session.status !== 'completed') continue;
    const count = milestoneCountsBySessionId.get(session.id) ?? 0;
    if (count === 0) continue;
    for (const memberOrGuest of session.characterIds ?? []) {
      // Only string IDs count (guests are objects)
      if (typeof memberOrGuest !== 'string') continue;
      eligibleByChar.set(
        memberOrGuest,
        (eligibleByChar.get(memberOrGuest) ?? 0) + count,
      );
    }
  }

  // Per-character claimed: count `milestone_spend` ledger entries
  const claimedByChar = new Map<string, number>();
  for (const entry of apLedger) {
    if (entry.kind !== 'milestone_spend') continue;
    claimedByChar.set(
      entry.characterId,
      (claimedByChar.get(entry.characterId) ?? 0) + 1,
    );
  }

  return characters.map((c) => {
    const eligible = eligibleByChar.get(c.id) ?? 0;
    const claimed = claimedByChar.get(c.id) ?? 0;
    return {
      characterId: c.id,
      displayName: c.displayName,
      eligible,
      claimed,
      unclaimed: Math.max(0, eligible - claimed),
    };
  });
}
