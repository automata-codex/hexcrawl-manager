import { readAllFinalizedLogsForSession } from '@skyreach/data';
import { ScribeEvent, SessionId } from '@skyreach/schemas';

export function loadFinalizedEventsForSessions(sessionIds: SessionId[]): ScribeEvent[] {
  const events: ScribeEvent[] = [];

  for (const sessionId of sessionIds) {
    events.push(...readAllFinalizedLogsForSession(sessionId));
  }

  // Sort globally by timestamp for deterministic downstream behavior
  events.sort((a, b) => {
    // Assuming ISO 8601 timestamps — lexical compare works, but safer to parse
    return new Date(a.ts).getTime() - new Date(b.ts).getTime();
  });

  return events;
}
