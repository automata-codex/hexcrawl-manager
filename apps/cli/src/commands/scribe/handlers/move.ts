import { error, info, usage, warn } from '@skyreach/cli-kit';
import { getHexNeighbors, isValidHexId, normalizeHexId } from '@skyreach/core';
import { canonicalTrailId, loadTrails } from '@skyreach/data';
import { PACES, type Pace } from '@skyreach/schemas';

import { appendEvent, readEvents } from '../../../services/event-log.service';
import {
  selectCurrentHex,
  isPartyLost,
} from '../../../services/projectors.service';
import { requireSession } from '../services/general';

import type { Context } from '../types';

export default function move(ctx: Context) {
  return (args: string[]) => {
    if (!requireSession(ctx)) {
      return;
    }
    if (!args[0]) {
      return usage('usage: move <HEX_ID> [lost] [slow|normal|fast]');
    }

    // Parse arguments
    const toRaw = args[0];
    let lostFlag = false;
    let pace: Pace = 'normal';

    for (let i = 1; i < args.length; i++) {
      const arg = args[i].toLowerCase() as Pace | 'lost';
      if (arg === 'lost') {
        lostFlag = true;
      } else if (PACES.includes(arg)) {
        pace = arg as Pace;
      } else {
        return usage('usage: move <HEX_ID> [lost] [slow|normal|fast]');
      }
    }

    const to = normalizeHexId(toRaw);
    if (!isValidHexId(to)) {
      return error('❌ Invalid hex id');
    }

    const events = ctx.file ? readEvents(ctx.file) : [];
    const from = selectCurrentHex(events);
    if (!from) {
      warn('(note) starting move has no previous hex');
    } else {
      // Adjacency check
      const neighbors = getHexNeighbors(from);
      if (!neighbors.includes(to)) {
        warn(`Warning: ${to} is not adjacent to ${from}.`);
      }
    }

    // Check if there's a permanent trail
    let isPermanentTrail = false;
    if (from) {
      try {
        const trails = loadTrails();
        const edgeId = canonicalTrailId(from, to);
        const trail = trails[edgeId];
        if (trail?.permanent) {
          isPermanentTrail = true;
        }
      } catch (err) {
        // Silently ignore trail loading errors
      }
    }

    // Use isPartyLost to determine lost state
    const alreadyLost = isPartyLost(events);

    if (lostFlag) {
      if (!alreadyLost) {
        appendEvent(ctx.file!, 'lost', { state: 'on', reason: 'nav-fail' });
        info(`Moved to ${to}. Lost state: ON.`);
      } else {
        info(`Moved to ${to}. (Already lost.)`);
      }
    } else {
      info(`Moved to ${to}.`);
    }

    if (isPermanentTrail) {
      info('ℹ️  Permanent trail: travel time is halved.');
    }

    // Emit move event
    appendEvent(ctx.file!, 'move', { from, to, pace });
  };
}
