import type { Context } from '../types';
import { info, usage } from '../lib/report.ts';

export default function weather(ctx: Context) {
  return async (args: string[]) => {
    const sub = (args[0] ?? '').toLowerCase();

    // Scaffold: subcommand handling structure
    switch (sub) {
      case 'roll':
      case 'propose':
      case 'set':
      case 'use':
      case 'clear':
      case 'show':
      case 'commit':
      case 'abandon':
        // Not yet implemented
        return usage('weather <roll|propose|set|use|clear|show|commit|abandon>');
      default:
        return usage('weather <roll|propose|set|use|clear|show|commit|abandon>');
    }
  };
}
