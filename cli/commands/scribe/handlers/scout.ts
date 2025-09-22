import {
  getHexNeighbors,
  isValidHexId,
  normalizeHexId,
} from '../../../../lib/hexes';
import { requireFile, requireSession } from '../lib/guards.ts';
import { error, info, usage } from '../lib/report.ts';
import { selectCurrentHex } from '../projectors.ts';
import { appendEvent, readEvents } from '../services/event-log';

import type { Context } from '../types';

export default function scout(ctx: Context) {
  return (args: string[]) => {
    if (!requireFile(ctx)) {
      return;
    }
    if (!requireSession(ctx)) {
      return;
    }
    if (!args[0]) {
      return usage('usage: scout <HEX_ID> [landmark]');
    }

    // Parse and normalize arguments
    const hexRaw = args[0];
    const landmarkFlag =
      args.length === 2 && args[1].toLowerCase() === 'landmark';
    if (args.length > 2 || (args.length === 2 && !landmarkFlag)) {
      return usage('usage: scout <HEX_ID> [landmark]');
    }

    const target = normalizeHexId(hexRaw);
    if (!isValidHexId(target)) {
      return error('❌ Invalid hex id');
    }

    const events = readEvents(ctx.file!); // Checked by `requireFile`
    const from = selectCurrentHex(events);
    if (!from) {
      return error('❌ No current hex available. Start a session first.');
    }

    // Block scouting current hex
    if (target === from) {
      return usage('❌ Cannot scout current hex.');
    }

    // Adjacency check
    const neighbors = getHexNeighbors(from);
    if (!neighbors.includes(target)) {
      info(`Warning: ${target} is not adjacent to ${from}.`);
    }

    // Emit scout event
    appendEvent(ctx.file!, 'scout', {
      from,
      target,
      reveal: {
        terrain: true,
        vegetation: true,
        landmark: landmarkFlag,
      },
    });

    // CLI output
    if (landmarkFlag) {
      info(`Scouted ${target}: terrain, vegetation, and landmark revealed.`);
    } else {
      info(`Scouted ${target}: terrain & vegetation revealed.`);
    }
  };
}
