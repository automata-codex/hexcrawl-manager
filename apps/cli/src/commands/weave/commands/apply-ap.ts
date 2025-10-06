import { assertSessionId } from '@skyreach/core';
import path from 'path';

import {
  discoverFinalizedScribeLogs,
  sortScribeIds,
} from '../../../services/sessions.service';

interface ApplyApOptions {
  allowDirty?: boolean;
  sessionId?: string;
}

interface ApplyApResult {
  sessionId: string;          // the session actually applied
  reportPath: string;         // where the report was (re)written
  entriesAppended: number;    // how many AP ledger entries were appended
  alreadyApplied: boolean;    // true if no-op due to matching fingerprint
}

export async function applyAp(opts: ApplyApOptions): Promise<ApplyApResult> {
  let createdAt: string = '';

  // --- Get a Valid Session ID ---
  if (opts.sessionId) {
    // Validate Session ID Format
    assertSessionId(opts.sessionId);
    const sessionNum = opts.sessionId.split('-')[1]; // TODO Rename this is sessionNumStr
    const allFiles = discoverFinalizedScribeLogs(sessionNum);
    if (allFiles.length === 0) {
      throw new Error(`No finalized logs for ${opts.sessionId}.`);
    }

    // Sort Scribe IDs
    const unsortedScribeIds = allFiles.map((f) => path.basename(f, '.jsonl'));
    const scribeIds = sortScribeIds(unsortedScribeIds);
  } else {
    // TODO Coming soon!
  }
}
