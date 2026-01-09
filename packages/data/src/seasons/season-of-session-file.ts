import { seasonIdFromEvents } from '@achm/core';
import path from 'path';

import { readOneFinalizedLog } from '../finalized-session-logs.js';

/** Read the first day_start from a session file and derive a normalized seasonId. */
export function seasonOfSessionFile(filePath: string): string {
  const events = readOneFinalizedLog(filePath);
  // pass a basename hint purely for nicer error messages
  return seasonIdFromEvents(events, path.basename(filePath));
}
