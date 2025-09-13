import type { Context } from '../types';
import { usage } from '../lib/report.ts';

import weatherRoll from './weather/roll';

export default function weather(ctx: Context) {
  return async (args: string[]) => {
    const sub = (args[0] ?? '').toLowerCase();

    // Scaffold: subcommand handling structure
    switch (sub) {
      case 'abandon':
      case 'clear':
      case 'commit':
        // Not yet implemented
        return usage('weather <abandon|clear|commit|propose|roll|set|show|use>');
      case 'propose':
        // fall thru
      case 'roll':
        weatherRoll(ctx);
        return;
      case 'set':
      case 'show':
      case 'use':
        // Not yet implemented
        return usage('weather <abandon|clear|commit|propose|roll|set|show|use>');
      default:
        return usage('weather <abandon|clear|commit|propose|roll|set|show|use>');
    }
  };
}
