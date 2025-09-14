import { Command } from 'commander';
import readline from 'node:readline';

import { scribeCompleter } from './completer';
import { CALENDAR_CONFIG } from './config/calendar.config.ts';
import { buildHandlers, showHelp } from './handlers';
import weatherNag from './hooks/weather-nag';
import { error, warn } from './lib/report.ts';
import { ensureLogs } from './lib/session-files';
import { tokenize } from './lib/tokenize.ts';
import { type Context } from './types';
import { CalendarService } from './services/calendar.ts';

export const scribeCommand = new Command('scribe')
  .description('Open the in-session logging shell')
  .argument('[presetSessionId]', 'Optional: preset session id to use with `start <hex>`')
  .action((presetSessionId?: string) => {
    ensureLogs();

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

    const handlers = buildHandlers(ctx, presetSessionId);

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
        } catch (e:any) {
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
