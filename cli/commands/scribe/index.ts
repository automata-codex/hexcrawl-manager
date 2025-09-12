import { Command } from 'commander';
import readline from 'node:readline';

import { scribeCompleter } from './completer';
import { buildHandlers, showHelp } from './handlers';
import { error, warn } from './lib/report.ts';
import { ensureLogs } from './lib/session-files';
import { tokenize } from './lib/tokenize.ts';
import { type Context } from './types';

export const scribeCommand = new Command('scribe')
  .description('Open the in-session logging shell')
  .argument('[presetSessionId]', 'Optional: preset session id to use with `start <hex>`')
  .action((presetSessionId?: string) => {
    ensureLogs();

    const ctx: Context = {
      sessionId: null,
      file: null,
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
      rl.prompt();
    });

    rl.on('close', () => process.exit(0));
  });
