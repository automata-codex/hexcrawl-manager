import { error, info, maybeOverride } from '@skyreach/cli-kit';
import { isValidHexId, normalizeHexId } from '@skyreach/core';
import { buildSessionFilename, loadMeta } from '@skyreach/data';
import { makeSessionId, type MetaV2Data } from '@skyreach/schemas';

import { appendEvent } from '../../../services/event-log.service';
import { prepareSessionStart } from '../services/session';

import type { Context } from '../types';

export type StartInteractiveValues = {
  hex: string;      // normalized (e.g., 'R14')
  seq: number;      // session sequence
  date: string;     // 'YYYY-MM-DD'
};

/**
 * Run the same work as the interactive flow, but with pre-supplied values.
 * Skips all prompts. Performs the same validations and file setup.
 */
export async function startInteractiveWithValues(
  ctx: Context,
  vals: StartInteractiveValues,
): Promise<void> {
  // Validate hex/date quickly (seq is checked by Number parse at call sites)
  if (!isValidHexId(vals.hex)) {
    error('❌ Invalid hex. Example: `R14`');
    return;
  }
  const hex = normalizeHexId(vals.hex);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vals.date)) {
    error('❌ Invalid date format; expected YYYY-MM-DD.');
    return;
  }

  const prep = prepareSessionStart({
    sessionNumber: vals.seq,
    date: new Date(vals.date),
    devMode: false,
  });
  if (!prep.ok) {
    error(prep.error);
    return;
  }

  ctx.sessionId = prep.sessionId;
  ctx.file = prep.inProgressFile;

  appendEvent(ctx.file, 'session_start', {
    id: ctx.sessionId,
    sessionDate: vals.date,
    startHex: hex,
    status: 'in-progress',
  });

  info(`started: ${prep.sessionId} @ ${hex}`);
}

// Main interactive session start handler
export async function handleInteractiveSessionStart(ctx: Context) {
  // Step 1: Prompt for hex
  const hex = await maybeOverride<string>('Enter starting hex ID', 'V17', {
    validate: (raw) => (isValidHexId(raw) ? undefined : 'Invalid hex ID'),
    parse: (raw) => normalizeHexId(raw as string),
    placeholder: 'A1',
    rl: ctx.rl,
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
      rl: ctx.rl,
    },
  );

  // Step 3: Prompt for date
  const today = new Date().toISOString().slice(0, 10);
  const date = await maybeOverride<string>('Session date (YYYY-MM-DD)', today, {
    validate: (raw) =>
      /\d{4}-\d{2}-\d{2}/.test(raw) ? undefined : 'Invalid date format',
    placeholder: today,
    rl: ctx.rl,
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

  // Step 6: Confirm
  const confirmed = await maybeOverride<boolean>(
    'Proceed with session creation?',
    true,
    {
      parse: (raw) => String(raw).toLowerCase() === 'y' || raw === '',
      placeholder: 'Y/n',
      rl: ctx.rl,
    },
  );
  if (!confirmed) {
    info('Session creation cancelled.');
    return;
  }

  // Step 7: Initialize context
  ctx.sessionId = prep.sessionId;
  ctx.file = prep.inProgressFile;

  // Step 8: Write session start event
  appendEvent(ctx.file, 'session_start', {
    id: ctx.sessionId,
    sessionDate: date,
    startHex: hex,
    status: 'in-progress',
  });
  info(`started: ${prep.sessionId} @ ${hex}`);
}
