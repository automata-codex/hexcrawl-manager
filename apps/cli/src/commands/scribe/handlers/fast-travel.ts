import { usage } from '@achm/cli-kit';
import { isValidHexId, normalizeHexId } from '@achm/core';
import { Pace } from '@achm/schemas';

import fastTravelAbort from './fast-travel/abort';
import fastTravelPlanAndExecute from './fast-travel/plan-and-execute';
import fastTravelResume from './fast-travel/resume';
import fastTravelStatus from './fast-travel/status';

import type { Context } from '../types';

export default function fastTravel(ctx: Context) {
  return (args: string[]) => {
    const subOrDest = (args[0] ?? '').toLowerCase();

    // Check for subcommands
    switch (subOrDest) {
      case 'status':
        return fastTravelStatus(ctx);
      case 'resume':
        return fastTravelResume(ctx);
      case 'abort':
        return fastTravelAbort(ctx);
      case '':
        return usage('usage: fast <dest> <pace> | status | resume | abort');
      default: {
        // Not a subcommand - assume it's a destination hex
        const dest = normalizeHexId(subOrDest);
        if (!isValidHexId(dest)) {
          return usage('usage: fast <dest> <pace> | status | resume | abort');
        }
        // Parse pace (second argument, defaults to normal)
        const pace = (args[1] ?? 'normal').toLowerCase();
        if (!['slow', 'normal', 'fast'].includes(pace)) {
          return usage('usage: fast <dest> <pace> | status | resume | abort');
        }
        return fastTravelPlanAndExecute(ctx, dest, pace as Pace);
      }
    }
  };
}
