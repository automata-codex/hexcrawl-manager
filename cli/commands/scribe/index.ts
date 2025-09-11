import { Command } from 'commander';
import readline from 'node:readline';
import { ensureLogs } from '../../utils/session-files';
import { scribeCompleter } from './completer';
import { makeHandlers } from './handlers';
import { tokenize } from './tokenize';
import { type Context } from './types';

export const scribeCommand = new Command('scribe')
  .description('Open the in-session logging shell')
  .argument('[presetSessionId]', 'Optional: preset session id to use with `start <hex>`')
  .action((presetSessionId?: string) => {
    ensureLogs();

    const ctx: Context = {
      sessionId: null,
      file: null,
      lastHex: null,
      party: [],
    };

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'scribe > ',
      historySize: 200,
      completer: scribeCompleter,
    });

    const { handlers, help } = makeHandlers(ctx, presetSessionId);

    help();
    rl.prompt();

    rl.on('line', async (line) => {
      const [cmd, ...args] = tokenize(line.trim());
      if (!cmd) { rl.prompt(); return; }
      const h = handlers[cmd];
      if (h) {
        try { await h(args); } catch (e:any) { console.error('Error:', e.message ?? e); }
      } else {
        console.log(`Unknown command: ${cmd}`);
      }
      rl.prompt();
    });

    rl.on('close', () => process.exit(0));
  });
