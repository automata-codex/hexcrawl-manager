// cli/commands/session.ts
import { Command } from 'commander';
import readline from 'node:readline';

const HELP_TEXT = `
Commands:
  start <id>        start/resume a session
  move <to> [pace]  record a move (pace: fast|normal|slow)
  note <text...>    add a note
  help              show this help
  exit/quit         leave the shell
`;

export const scribeCommand = new Command('scribe')
  .description('Open the in-session logging shell')
  .argument('[sessionId]', 'Optional: auto-start this session')
  .action((sessionId?: string) => {
    const ctx = { sessionId: null as string | null, lastHex: null as string | null };

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'scribe > '
    });

    const help = () => {
      console.log(HELP_TEXT);
    };

    const handlers: Record<string, (args: string[]) => void> = {
      start: (args) => {
        ctx.sessionId = args[0] ?? 'unnamed';
        console.log(`started: ${ctx.sessionId}`);
      },
      move: (args) => {
        if (!ctx.sessionId) {
          return console.log('⚠ start a session first');
        }
        const to = args[0]?.toUpperCase();
        const pace = args[1] ?? 'normal';
        ctx.lastHex = to;
        console.log(`  move to ${to} [${pace}]`);
      },
      note: (args) => {
        if (!ctx.sessionId) {
          return console.log('⚠ start a session first');
        }
        console.log(`  note: ${args.join(' ')}`);
      },
      help: () => help(),
      exit: () => rl.close(),
      quit: () => rl.close()
    };

    help();
    rl.prompt();

    rl.on('line', (line) => {
      const [cmd, ...args] = line.trim().split(/\s+/);
      if (!cmd) {
        rl.prompt();
        return;
      }
      const h = handlers[cmd];
      if (h) {
        h(args);
      } else {
        console.log(`Unknown command: ${cmd}`);
      }
      rl.prompt();
    });

    rl.on('close', () => process.exit(0));

    if (sessionId) {
      handlers.start([sessionId]);
    }
  });
