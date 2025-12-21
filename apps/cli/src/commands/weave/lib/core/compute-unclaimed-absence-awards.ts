import type {
  ApLedgerEntry,
  CharacterData,
  SessionReport,
} from '@achm/schemas';

type UnclaimedAbsenceSummary = {
  characterId: string;
  displayName: string;
  eligibleMissed: number;
  claimed: number;
  unclaimed: number;
  introducedAt?: string; // YYYY-MM-DD (derived)
  retiredAt?: string; // YYYY-MM-DD (from lifecycle, if any)
};

/**
 * Compute unclaimed absence awards per character using the hybrid model.
 *
 * Rules:
 * - A character accrues at most 1 absence award per **completed session** they did not attend,
 *   starting from their first attended session ("introducedAt") through the end of the window.
 * - The window ends at character.lifecycle.retiredAt (if present) or the latest completed session date.
 * - "Claimed" awards are the sum of deltas in AP ledger entries with kind === 'absence_spend'.
 * - Unclaimed = max(0, eligibleMissed - claimed).
 *
 * Assumptions guaranteed by the provided schemas:
 * - Completed session reports have a `status: 'completed'` and `sessionDate` (YYYY-MM-DD).
 * - Attendance is in `characterIds`; only string IDs count (guest objects are ignored).
 * - AP ledger absence allocations are recorded as `kind: 'absence_spend'` entries,
 *   with per-pillar deltas in `advancementPoints.{combat,exploration,social}.delta`.
 */
export function computeUnclaimedAbsenceAwards(
  sessions: SessionReport[],
  characters: CharacterData[],
  apLedger: ApLedgerEntry[],
): UnclaimedAbsenceSummary[] {
  // 1) Filter to completed sessions with valid YYYY-MM-DD sessionDate
  const completed = sessions
    .filter(
      (s): s is Extract<SessionReport, { status: 'completed' }> =>
        s.status === 'completed',
    )
    .filter(
      (s) => typeof s.sessionDate === 'string' && s.sessionDate.length === 10,
    );

  // Sort by date ascending (YYYY-MM-DD is lexicographically sortable)
  completed.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

  const lastCompletedDate = completed.at(-1)?.sessionDate;

  // Early exit: if no completed sessions, nobody accrues anything
  if (!lastCompletedDate) {
    return characters.map((c) => ({
      characterId: c.id,
      displayName: c.displayName,
      eligibleMissed: 0,
      claimed: 0,
      unclaimed: 0,
      retiredAt: c.lifecycle?.retiredAt,
    }));
  }

  // Pre-index: attendance per session (strings only; ignore GuestCharacter objects)
  const attendanceBySessionId = new Map<string, Set<string>>();
  for (const s of completed) {
    const present = new Set(
      (s.characterIds ?? []).filter(
        (idOrGuest): idOrGuest is string => typeof idOrGuest === 'string',
      ),
    );
    attendanceBySessionId.set(s.id, present);
  }

  // Helper: derive "introducedAt" = first sessionDate where character attended
  function deriveIntroducedAt(characterId: string): string | undefined {
    for (const s of completed) {
      const present = attendanceBySessionId.get(s.id)?.has(characterId);
      if (present) return s.sessionDate;
    }
    return undefined;
  }

  // Precompute claimed absence awards per character from ledger
  // Only 'absence_spend' entries count. Sum pillar deltas.
  const claimedByChar = new Map<string, number>();
  for (const entry of apLedger) {
    if (entry.kind !== 'absence_spend') continue;
    const { characterId } = entry;
    const ap = entry.advancementPoints;
    const inc =
      (ap.combat?.delta ?? 0) +
      (ap.exploration?.delta ?? 0) +
      (ap.social?.delta ?? 0);
    if (inc > 0) {
      claimedByChar.set(
        characterId,
        (claimedByChar.get(characterId) ?? 0) + inc,
      );
    }
  }

  // Main computation per character
  const results: UnclaimedAbsenceSummary[] = [];

  for (const c of characters) {
    const introducedAt = deriveIntroducedAt(c.id);

    // If never attended any completed session, do not accrue absence awards yet
    if (!introducedAt) {
      results.push({
        characterId: c.id,
        displayName: c.displayName,
        eligibleMissed: 0,
        claimed: claimedByChar.get(c.id) ?? 0,
        unclaimed: 0,
        retiredAt: c.lifecycle?.retiredAt,
      });
      continue;
    }

    // Window end: retiredAt (if present) else lastCompletedDate
    const retiredAt = c.lifecycle?.retiredAt;
    const windowEnd =
      retiredAt && retiredAt < lastCompletedDate
        ? retiredAt
        : lastCompletedDate;

    // If the window is inverted for any reason, no accrual
    if (windowEnd < introducedAt) {
      results.push({
        characterId: c.id,
        displayName: c.displayName,
        eligibleMissed: 0,
        claimed: claimedByChar.get(c.id) ?? 0,
        unclaimed: 0,
        introducedAt,
        retiredAt,
      });
      continue;
    }

    // Count eligible missed sessions in [introducedAt, windowEnd], inclusive
    let eligibleMissed = 0;
    for (const s of completed) {
      const d = s.sessionDate;
      if (d < introducedAt || d > windowEnd) continue;
      const present = attendanceBySessionId.get(s.id)?.has(c.id) ?? false;
      if (!present) eligibleMissed += 1;
    }

    const claimed = claimedByChar.get(c.id) ?? 0;
    const unclaimed = Math.max(0, eligibleMissed - claimed);

    results.push({
      characterId: c.id,
      displayName: c.displayName,
      eligibleMissed,
      claimed,
      unclaimed,
      introducedAt,
      retiredAt,
    });
  }

  return results;
}
