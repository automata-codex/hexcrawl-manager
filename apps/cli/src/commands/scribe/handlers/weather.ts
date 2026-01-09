import { usage } from '@achm/cli-kit';

import weatherAbandon from './weather/abandon';
import weatherClear from './weather/clear';
import weatherCommit from './weather/commit';
import weatherRoll from './weather/roll';
import weatherSet from './weather/set';
import weatherShow from './weather/show';
import weatherUse from './weather/use';

import type { Context } from '../types';

export default function weather(ctx: Context) {
  return async (args: string[]) => {
    const sub = (args[0] ?? '').toLowerCase();

    // Scaffold: subcommand handling structure
    switch (sub) {
      case 'abandon':
        weatherAbandon(ctx);
        return;
      case 'clear':
        weatherClear(ctx);
        return;
      case 'commit':
        weatherCommit(ctx);
        return;
      case 'propose':
      // fall thru
      case 'roll':
        weatherRoll(ctx);
        return;
      case 'set':
        weatherSet(ctx, args);
        return;
      case 'show':
        weatherShow(ctx);
        return;
      case 'use':
        weatherUse(ctx, args);
        return;
      default:
        return usage(
          'weather <abandon|clear|commit|propose|roll|set|show|use>',
        );
    }
  };
}
