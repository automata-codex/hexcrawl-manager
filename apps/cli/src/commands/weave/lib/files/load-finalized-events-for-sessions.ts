import { readAllFinalizedLogsForSession } from '@achm/data';
import { ScribeEvent, SessionId } from '@achm/schemas';

export function loadFinalizedEventsForSessions(
  sessionIds: SessionId[],
): ScribeEvent[] {
  const events: ScribeEvent[] = [];

  for (const sessionId of sessionIds) {
    events.push(...readAllFinalizedLogsForSession(sessionId));
  }

  // Sort globally by timestamp for deterministic downstream behavior
  events.sort((a, b) => {
    // Handle missing timestamps by treating them as earliest
    const aTime = a.ts ? new Date(a.ts).getTime() : 0;
    const bTime = b.ts ? new Date(b.ts).getTime() : 0;
    return aTime - bTime;
  });

  return events;
}
