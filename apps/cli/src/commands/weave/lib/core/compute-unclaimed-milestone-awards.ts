import { MILESTONE_AP_CAP } from './milestone-ap';

import type {
  ApLedgerEntry,
  CharacterData,
  SessionReport,
} from '@achm/schemas';

export type UnclaimedMilestoneSummary = {
  characterId: string;
  displayName: string;
  eligibleAp: number;
  claimedAp: number;
  unclaimedAp: number;
};

/**
 * Sum a character's pillar AP across their `session_ap` ledger entries for a
 * session. Returns `null` when no `session_ap` entry exists yet for that
 * (character, session) — i.e. pillar AP has not been applied — mirroring
 * `getEagerTopUp` in `allocate-ap-milestone.ts`, but over the in-memory ledger.
 */
function sessionApTotal(
  apLedger: ApLedgerEntry[],
  characterId: string,
  sessionId: string,
): number | null {
  let total = 0;
  let found = false;
  for (const entry of apLedger) {
    if (
      entry.kind === 'session_ap' &&
      entry.characterId === characterId &&
      entry.sessionId === sessionId
    ) {
      found = true;
      total +=
        (entry.advancementPoints.combat?.delta ?? 0) +
        (entry.advancementPoints.exploration?.delta ?? 0) +
        (entry.advancementPoints.social?.delta ?? 0);
    }
  }
  return found ? total : null;
}

/**
 * Compute per-character milestone AP (not award counts).
 *
 * Milestone AP is the top-up mechanic from
 * `docs/specs/milestone-ap-reconciliation.md`: a milestone event carries no AP
 * value of its own. The AP a character earns from a milestone is, per character
 * per session, `topUp = max(0, MILESTONE_AP_CAP - sessionTotal)`, where
 * `sessionTotal` is that character's pillar AP from their `session_ap` ledger
 * entry for the session.
 *
 * Eligible AP: for each completed session that has ≥1 milestone event (per
 * `milestoneCountsBySessionId`) and that the character attended (in the report's
 * `characterIds` roster), add one per-session top-up. The cap is per session,
 * not per event — multiple milestones in a session do not stack. When no
 * `session_ap` entry exists yet for the character (pillar AP not applied), the
 * top-up isn't computable, so eligible AP defaults to the full cap; it
 * self-corrects once `weave apply ap` runs.
 *
 * Claimed AP: the sum of the three pillar deltas across the character's
 * `milestone_spend` ledger entries (mirrors `aggregate.ts`).
 *
 * Unclaimed AP: `max(0, eligibleAp - claimedAp)`.
 */
export function computeUnclaimedMilestoneAwards(
  sessions: SessionReport[],
  characters: CharacterData[],
  apLedger: ApLedgerEntry[],
  milestoneCountsBySessionId: Map<string, number>,
): UnclaimedMilestoneSummary[] {
  // Per-character eligible AP: sum of per-session top-ups for milestone
  // sessions they attended.
  const eligibleApByChar = new Map<string, number>();
  for (const session of sessions) {
    if (session.status !== 'completed') continue;
    const count = milestoneCountsBySessionId.get(session.id) ?? 0;
    // The map value is used only as a boolean "this session has a milestone".
    // The cap is per session, so a 2-milestone session yields a single top-up.
    if (count === 0) continue;
    for (const memberOrGuest of session.characterIds ?? []) {
      // Only string IDs count (guests are objects)
      if (typeof memberOrGuest !== 'string') continue;
      const total = sessionApTotal(apLedger, memberOrGuest, session.id);
      const topUp =
        total === null
          ? MILESTONE_AP_CAP
          : Math.max(0, MILESTONE_AP_CAP - total);
      eligibleApByChar.set(
        memberOrGuest,
        (eligibleApByChar.get(memberOrGuest) ?? 0) + topUp,
      );
    }
  }

  // Per-character claimed AP: sum of pillar deltas across `milestone_spend`
  // ledger entries.
  const claimedApByChar = new Map<string, number>();
  for (const entry of apLedger) {
    if (entry.kind !== 'milestone_spend') continue;
    const delta =
      (entry.advancementPoints.combat?.delta ?? 0) +
      (entry.advancementPoints.exploration?.delta ?? 0) +
      (entry.advancementPoints.social?.delta ?? 0);
    claimedApByChar.set(
      entry.characterId,
      (claimedApByChar.get(entry.characterId) ?? 0) + delta,
    );
  }

  return characters.map((c) => {
    const eligibleAp = eligibleApByChar.get(c.id) ?? 0;
    const claimedAp = claimedApByChar.get(c.id) ?? 0;
    return {
      characterId: c.id,
      displayName: c.displayName,
      eligibleAp,
      claimedAp,
      unclaimedAp: Math.max(0, eligibleAp - claimedAp),
    };
  });
}
