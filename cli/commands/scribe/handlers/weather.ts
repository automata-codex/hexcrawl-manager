import type { Context } from '../types';
import { info, usage } from '../lib/report.ts';

export default function weather(ctx: Context) {
  return async (args: string[]) => {
    const sub = (args[0] ?? '').toLowerCase();

    // Scaffold: subcommand handling structure
    switch (sub) {
      case 'abandon':
      case 'clear':
      case 'commit':
      case 'propose':
      case 'roll':
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
