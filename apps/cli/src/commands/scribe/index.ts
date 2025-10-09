import { error, warn } from '@skyreach/cli-kit';
import { CALENDAR_CONFIG } from '@skyreach/core';
import { ensureRepoDirs } from '@skyreach/data';
import { Command } from 'commander';
import readline from 'node:readline';

import { scribeCompleter } from './completer';
import { buildHandlers, showHelp } from './handlers';
import weatherNag from './hooks/weather-nag';
import { CalendarService } from './services/calendar';
import { tokenize } from './services/general';
import { type Context } from './types';

export const scribeCommand = new Command('scribe')
  .description('Open the in-session logging shell')
  .option('--dev', 'Enable developer mode')
  .action(() => {
    ensureRepoDirs();

    const ctx: Context = {
      sessionId: null,
      file: null,
      calendar: new CalendarService(CALENDAR_CONFIG),
    };

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'scribe > ',
      historySize: 200,
      completer: scribeCompleter,
    });

    const handlers = buildHandlers(ctx);

    showHelp();
    rl.prompt();

    // Post-command hook: runs after every command
    function postCommandHook(ctx: Context, cmd: string) {
      weatherNag(ctx, cmd);
    }

    rl.on('line', async (line) => {
      const [cmd, ...args] = tokenize(line.trim());
      if (!cmd) {
        rl.prompt();
        return;
      }
      const h = handlers[cmd];
      if (h) {
        try {
          await h(args);
        } catch (e: any) {
          error(`Error: ${e?.message ?? e}`);
        }
      } else {
        warn(`Unknown command: ${cmd}`);
      }
      postCommandHook(ctx, cmd);
      rl.prompt();
    });

    rl.on('close', () => process.exit(0));
  });
