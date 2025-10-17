import { error, info, usage } from '@skyreach/cli-kit';
import { isValidHexId, normalizeHexId } from '@skyreach/core';
import { buildSessionFilename } from '@skyreach/data';
import { SESSION_ID_RE } from '@skyreach/schemas';
import fs from 'node:fs';

import { appendEvent, readEvents } from '../../../services/event-log.service';
import { selectCurrentHex } from '../../../services/projectors.service';
import { detectDevMode } from '../services/general';
import { prepareSessionStart } from '../services/session';

import {
  handleInteractiveSessionStart,
  startInteractiveWithValues,
} from './start-interactive';

import type { Context } from '../types';

function parseInteractiveFlags(argv: string[]) {
  // very small flag parser: --hex R14 --seq 5 --date 2025-09-27 --yes
  const out: { hex?: string; seq?: number; date?: string; yes?: boolean } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--hex') out.hex = argv[++i];
    else if (a === '--seq') out.seq = Number(argv[++i]);
    else if (a === '--date') out.date = argv[++i];
    else if (a === '--yes' || a === '--confirm' || a === '--no-prompt')
      out.yes = true;
  }
  return out;
}

export default function start(ctx: Context) {
  return async (args: string[]) => {
    // Remove --dev if present
    const filteredArgs = args.filter((a) => a !== '--dev');
    const devMode = detectDevMode(args);
    const now = new Date();

    // Step 1: Argument Parsing
    if (filteredArgs.length === 0) {
      usage(
        `Usage:
  start <HEX>          Start a new session in the given hex.
  start interactive    Launch interactive session setup.`,
      );
      return;
    }

    // First token determines sub-mode; any remaining tokens are flags for "interactive"
    const arg = filteredArgs[0];
    const flagArgs = filteredArgs.slice(1);

    if (arg === 'interactive') {
      // Step 2: Dev Mode Handling for interactive
      if (devMode) {
        error('`start interactive` is unavailable in dev mode.');
        return;
      }

      const flags = parseInteractiveFlags(flagArgs);
      const hasAnyFlag =
        flags.hex !== undefined ||
        flags.seq !== undefined ||
        flags.date !== undefined ||
        flags.yes;
      const allProvided = Boolean(
        flags.hex && Number.isFinite(flags.seq) && flags.date && flags.yes,
      );

      if (hasAnyFlag && !allProvided) {
        usage(
          `Usage:
  start interactive --hex <HEX> --seq <N> --date <YYYY-MM-DD> --yes`,
        );
        return;
      }

      if (allProvided) {
        await startInteractiveWithValues(ctx, {
          hex: flags.hex!,
          seq: flags.seq!,
          date: flags.date!,
        });
        return;
      }

      await handleInteractiveSessionStart(ctx);
      return;
    }

    // For non-interactive <HEX> path, require exactly one arg (the hex)
    if (filteredArgs.length !== 1) {
      usage(
        `Usage:
  start <HEX>                         Start a new session in the given hex.
  start interactive                   Launch interactive session setup.`,
      );
      return;
    }

    if (!arg || !isValidHexId(arg)) {
      error('❌ Invalid hex. Example: `start P13`');
      return;
    }
    const startHexNorm = normalizeHexId(arg);

    // Prepare session (ID, file, lock, etc) -- always auto-generate sessionId
    const prep = prepareSessionStart({
      devMode,
      date: now,
    });
    if (!prep.ok) {
      error(prep.error);
      return;
    }
    ctx.sessionId = prep.sessionId;
    ctx.file = prep.inProgressFile;

    // Step 3: Enforce sessionId/filename conventions and handle lock files
    // Extract sessionDate from filename (for event)
    let sessionDate = '';
    let sessionSeq = '';
    let filenameStem = '';
    if (devMode) {
      // Dev mode: sessionId = filename stem = dev_<ISO>
      filenameStem = prep.sessionId;
      sessionDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
    } else {
      // TODO I feel like this can be less ugly
      // Production: session_<SEQ>_<YYYY-MM-DD>
      const match = prep.sessionId.match(SESSION_ID_RE);
      if (!match) {
        error('Session ID does not match required production format.');
        return;
      }
      sessionSeq = match[1];
      sessionDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
      filenameStem = buildSessionFilename(
        parseInt(sessionSeq, 10),
        sessionDate,
      ).replace('.jsonl', '');
    }

    // Ensure sessionId matches filename stem
    if (!ctx.file.includes(filenameStem)) {
      error('Session file path does not match sessionId stem. Aborting.');
      return;
    }

    // Step 5: Write or resume session_start event
    if (!fs.existsSync(ctx.file)) {
      appendEvent(ctx.file, 'session_start', {
        status: 'in-progress',
        id: prep.sessionId,
        startHex: startHexNorm,
        sessionDate,
      });
      info(`started: ${prep.sessionId} @ ${startHexNorm}`);
    } else {
      const evs = readEvents(ctx.file);
      const lastHex = selectCurrentHex(evs) ?? startHexNorm;
      info(
        `resumed: ${prep.sessionId} (${evs.length} events)${lastHex ? ` — last hex ${lastHex}` : ''}`,
      );
    }
  };
}
