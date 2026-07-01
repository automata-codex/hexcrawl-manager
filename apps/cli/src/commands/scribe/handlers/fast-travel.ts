import { usage } from '@achm/cli-kit';
import { isValidHexId, normalizeHexId } from '@achm/core';
import { loadMapConfig } from '@achm/data';
import { Pace } from '@achm/schemas';

import fastTravelAbort from './fast-travel/abort';
import fastTravelPlanAndExecute from './fast-travel/plan-and-execute';
import fastTravelResume from './fast-travel/resume';
import fastTravelStatus from './fast-travel/status';

import type { Context } from '../types';

const USAGE =
  'usage: fast <dest> <pace> [--no-rec] | resume [--no-rec] | status | abort';

export default function fastTravel(ctx: Context) {
  return (args: string[]) => {
    // Split flags (`--…`) from positional args so `--no-rec` can appear
    // anywhere on the line. `--no-rec` skips random encounter checks (REC);
    // any other flag is a typo we surface rather than silently ignore.
    const flags = args.filter((a) => a.startsWith('--'));
    const positional = args.filter((a) => !a.startsWith('--'));
    const skipRec = flags.some((f) => f.toLowerCase() === '--no-rec');
    if (flags.some((f) => f.toLowerCase() !== '--no-rec')) {
      return usage(USAGE);
    }

    const subOrDest = (positional[0] ?? '').toLowerCase();

    // Check for subcommands
    switch (subOrDest) {
      case 'status':
        return fastTravelStatus(ctx);
      case 'resume':
        return fastTravelResume(ctx, skipRec);
      case 'abort':
        return fastTravelAbort(ctx);
      case '':
        return usage(USAGE);
      default: {
        // Not a subcommand - assume it's a destination hex
        const notation = loadMapConfig().grid.notation;
        const dest = normalizeHexId(subOrDest, notation);
        if (!isValidHexId(dest, notation)) {
          return usage(USAGE);
        }
        // Parse pace (second positional arg, defaults to normal)
        const pace = (positional[1] ?? 'normal').toLowerCase();
        if (!['slow', 'normal', 'fast'].includes(pace)) {
          return usage(USAGE);
        }
        return fastTravelPlanAndExecute(ctx, dest, pace as Pace, skipRec);
      }
    }
  };
}
