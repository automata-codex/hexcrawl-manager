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

const LEGACY_MILESTONE_TODO_PREFIX = 'Add AP for milestone:';

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
    eligible: number;
    claimed: number;
    unclaimed: number;
  }>;
}

/**
 * For each completed session, count milestone occurrences. The JSONL log is
 * the canonical source; legacy `todo`-with-prefix entries on the report are
 * used only as a fallback for sessions whose JSONL log has not yet been
 * migrated to structured `milestone` events.
 *
 * If a session has at least one structured `milestone` event in its JSONL
 * log, only those are counted — any leftover legacy entries on
 * `report.todo[]` for the same session are ignored. This avoids
 * double-counting during the data-repo migration, where the JSONL line is
 * rewritten but the completed report's `todo[]` array still carries the old
 * prefix entry from the original `weave apply ap` run (apply's fingerprint
 * short-circuit prevents the report from being refreshed).
 *
 * Returns a Map<sessionId, count>. Sessions with zero milestones are absent.
 *
 * TODO(post-migration): once all legacy `todo`-prefix entries have been
 * migrated, drop the fallback branch entirely.
 */
function collectMilestoneCountsBySessionId(
  sessions: SessionReport[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const session of sessions) {
    if (session.status !== 'completed') continue;

    // (1) Canonical: structured `milestone` events in the JSONL log.
    let structuredCount = 0;
    const sessionNum = session.id.split('-')[1];
    if (sessionNum && discoverFinalizedLogsFor(sessionNum).length > 0) {
      try {
        const events = readAllFinalizedLogsForSession(sessionNum);
        structuredCount = events.filter((e) => e.kind === 'milestone').length;
      } catch {
        // unreadable log — ignore for status (don't fail the command)
      }
    }

    if (structuredCount > 0) {
      out.set(session.id, structuredCount);
      continue;
    }

    // (2) Fallback: legacy `todo`-with-prefix entries on the report.
    let legacyCount = 0;
    for (const t of session.todo ?? []) {
      if (
        typeof t.text === 'string' &&
        t.text.startsWith(LEGACY_MILESTONE_TODO_PREFIX)
      ) {
        legacyCount += 1;
      }
    }
    if (legacyCount > 0) out.set(session.id, legacyCount);
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
