import {
  discoverCompletedReports,
  discoverFinalizedLogs,
} from '@achm/data';
import {
  SessionId,
  assertSessionId,
  isSessionId,
  makeSessionId,
} from '@achm/schemas';

export type ApWorkItem = { kind: 'session'; sessionId: SessionId };

/** Discover **pending** sessions for AP and return ordered work items. */
function resolveApSweep(): ApWorkItem[] {
  // 1) All finalized sessions we could potentially apply
  const sessionNumbers = Array.from(
    new Set(discoverFinalizedLogs().map((log) => log.sessionNumber)),
  ).sort((a, b) => a - b);

  // 2) Sessions already completed (reports with status: 'completed')
  const completedSessions = discoverCompletedReports();

  // 3) Pending = finalized - completed
  const pending = sessionNumbers.filter((n) => !completedSessions.includes(n));

  // 4) Return in stable, ascending order
  return pending.map((n) => ({
    kind: 'session' as const,
    sessionId: makeSessionId(n),
  }));
}

/**
 * Resolve a target into an ordered list of AP work items.
 * - undefined      => sweep all **pending** sessions (finalized log present, report not completed),
 *                    returned in ascending session order.
 * - session-0001   => [ { kind: 'session', sessionId: 'session-0001' } ]
 * - (season IDs are invalid for AP)
 */
export function resolveApTarget(target: string | undefined): ApWorkItem[] {
  if (!target) {
    return resolveApSweep();
  }

  if (isSessionId(target)) {
    return [{ kind: 'session', sessionId: assertSessionId(target) }];
  }

  throw new Error(
    `Invalid target "${target}": AP accepts only a session ID (e.g. session-0042).`,
  );
}
