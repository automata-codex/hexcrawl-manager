import { assertSessionId } from '@skyreach/core';

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
    assertSessionId(opts.sessionId)
  } else {
    // TODO Coming soon!
  }
}
