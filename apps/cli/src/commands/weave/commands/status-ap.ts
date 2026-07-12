import { warn } from '@achm/cli-kit';
import {
  aggregateApByCharacter,
  discoverFinalizedLogsFor,
  readApLedger,
  readAllFinalizedLogsForSession,
  REPO_PATHS,
} from '@achm/data';
import {
  ApLedgerEntry,
  ApLedgerEntrySchema,
  SessionReport,
} from '@achm/schemas';

import { loadAllCharacters } from '../../../services/characters.service';
import { loadAllSessionReports } from '../../../services/sessions.service';
import { computeUnclaimedAbsenceAwards } from '../lib/core/compute-unclaimed-absence-awards';
import { computeUnclaimedMilestoneAwards } from '../lib/core/compute-unclaimed-milestone-awards';

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
  milestoneAwards: Array<{
    characterId: string;
    displayName: string;
    eligibleAp: number;
    claimedAp: number;
    unclaimedAp: number;
  }>;
}

/**
 * For each completed session, count structured `milestone` events in the
 * JSONL log. Returns a Map<sessionId, count>; sessions with zero milestones
 * are absent.
 */
function collectMilestoneCountsBySessionId(
  sessions: SessionReport[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const session of sessions) {
    if (session.status !== 'completed') continue;

    const sessionNum = session.id.split('-')[1];
    if (!sessionNum || discoverFinalizedLogsFor(sessionNum).length === 0) {
      continue;
    }

    try {
      const events = readAllFinalizedLogsForSession(sessionNum);
      const count = events.filter((e) => e.kind === 'milestone').length;
      if (count > 0) out.set(session.id, count);
    } catch {
      // unreadable log — ignore for status (don't fail the command)
    }
  }
  return out;
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

  // 5) Compute unclaimed milestone awards
  const milestoneCountsBySessionId =
    collectMilestoneCountsBySessionId(sessionReports);
  const milestoneAwards = computeUnclaimedMilestoneAwards(
    sessionReports,
    activeCharacters,
    ledgerEntries,
    milestoneCountsBySessionId,
  );

  return { apByCharacter, absenceAwards, milestoneAwards };
}
