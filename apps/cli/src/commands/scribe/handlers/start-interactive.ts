import { error, info, maybeOverride } from '@skyreach/cli-kit';
import { isValidHexId, normalizeHexId } from '@skyreach/core';
import { buildSessionFilename, loadMeta } from '@skyreach/data';
import { makeSessionId, type MetaV2Data } from '@skyreach/schemas';

import { appendEvent } from '../../../services/event-log.service';
import { prepareSessionStart } from '../services/session';

// Main interactive session start handler
export async function handleInteractiveSessionStart() {
  // Step 1: Prompt for hex
  const hex = await maybeOverride<string>('Enter starting hex ID', '', {
    validate: (raw) => (isValidHexId(raw) ? undefined : 'Invalid hex ID'),
    parse: (raw) => normalizeHexId(raw as string),
    placeholder: 'e.g. A1',
  });

  // Step 2: Prompt for sequence
  const meta: MetaV2Data = loadMeta();
  const seq = await maybeOverride<number>(
    'Session sequence number',
    meta.nextSessionSeq,
    {
      validate: (raw) => (isNaN(Number(raw)) ? 'Must be a number' : undefined),
      parse: (raw) => Number(raw),
      placeholder: String(meta.nextSessionSeq),
    },
  );

  // Step 3: Prompt for date
  const today = new Date().toISOString().slice(0, 10);
  const date = await maybeOverride<string>('Session date (YYYY-MM-DD)', today, {
    validate: (raw) =>
      /\d{4}-\d{2}-\d{2}/.test(raw) ? undefined : 'Invalid date format',
    placeholder: today,
  });

  // Step 4: Preview session stem and file
  const sessionId = makeSessionId(seq);
  const sessionFile = buildSessionFilename(sessionId, date);
  info(`Session stem: ${sessionId}`);
  info(`Session file: ${sessionFile}`);

  // Step 5: Prepare session (lock, file checks)
  const prep = prepareSessionStart({
    sessionNumber: seq,
    date: new Date(date),
    devMode: false,
  });
  if (!prep.ok) {
    error(prep.error);
    return;
  }

  // Step 6: Confirm and write
  const confirmed = await maybeOverride<boolean>(
    'Proceed with session creation?',
    true,
    {
      parse: (raw) => String(raw).toLowerCase() === 'y' || raw === '',
      placeholder: 'Y/n',
    },
  );
  if (!confirmed) {
    info('Session creation cancelled.');
    return;
  }

  // Step 7: Write session start event
  appendEvent(sessionFile, 'session_start', {
    id: sessionId,
    sessionDate: date,
    startHex: hex,
    status: 'in-progress',
  });
  info(`Session started: ${sessionFile}`);
}
