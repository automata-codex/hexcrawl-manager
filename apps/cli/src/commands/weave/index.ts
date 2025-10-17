import { Command, Option } from 'commander';

import { allocateFromCli as allocateHandler } from './commands/allocate';
import { apply as applyHandler } from './commands/apply';
import { plan as planHandler } from './commands/plan';
import { status as statusHandler } from './commands/status';

export const weaveCommand = new Command('weave').description(
  'Use session and rollover artifacts to update campaign state',
);

// ---- allocate (parent) ----
const allocateCommand = new Command('allocate')
  .description('Allocate Advancement Points (AP) to a character');

// `weave allocate ap` -> allocate AP to one or more characters
const allocateAp = new Command('ap')
  .description('Allocate AP to one or more characters')
  // Define options purely for help/UX. We won’t use these parsed values.
  .addOption(
    new Option('--character <id>', 'Character ID (starts a new allocation block)'),
  )
  .addOption(new Option('--amount <n>', 'Total credits to allocate in this block'))
  .addOption(new Option('--combat <n>', 'Combat pillar credits for this block'))
  .addOption(new Option('--exploration <n>', 'Exploration pillar credits for this block'))
  .addOption(new Option('--social <n>', 'Social pillar credits for this block'))
  .option('--note <text>', 'Optional note for the current block')
  .option('--dry-run', 'Show what would be allocated without making changes')
  .addHelpText(
    'after',
    `
Examples:
  # Spend N credits for a Tier-1 character, mapping credits to pillars explicitly
  weave allocate ap --character <id> --amount 3 --combat 1 --exploration 2 --note "Missed 0021"

  # Multiple characters (repeat flags per character)
  weave allocate ap \\
    --character <id1> --amount 2 --social 2 \\
    --character <id2> --amount 1 --exploration 1

Notes:
  • Each --character begins a new allocation block.
  • If any pillar flags are present in a block, their sum must equal --amount.
  • --dry-run applies to all blocks.
`,
  )
  // Allow repeats; we’ll parse from raw argv downstream.
  .allowUnknownOption(true)
  .action(async (_a, _b, command) => {
    const opts = command.optsWithGlobals();
    const raw = command.parent?.parent?.rawArgs ?? process.argv;

    // If user ran just `weave allocate ap`, show help instead of a vague error.
    const afterAp = sliceAfterWeaveAllocateAp(raw);
    if (afterAp.length === 0) {
      command.help({ error: false });
      return;
    }

    await allocateHandler(raw, !!opts.dryRun);
  });

allocateCommand.addCommand(allocateAp);
weaveCommand.addCommand(allocateCommand);

// --- helper kept local to CLI so help works even without importing orchestrator utils ---
function sliceAfterWeaveAllocateAp(rawArgs: string[]): string[] {
  const iWeave = rawArgs.findIndex((t) => t === 'weave');
  if (iWeave === -1) {
    return [];
  }
  const iAllocate = rawArgs.slice(iWeave + 1).findIndex((t) => t === 'allocate');
  if (iAllocate === -1) {
    return [];
  }
  const iAp = rawArgs.slice(iWeave + 1 + iAllocate + 1).findIndex((t) => t === 'ap');
  if (iAp === -1) {
    return [];
  }
  const start = iWeave + 1 + iAllocate + 1 + iAp + 1;
  return rawArgs.slice(start);
}

// ---- apply (parent) ----
// `weave apply [sessionId]` -> defaults to AP application
const applyCommand = new Command('apply')
  .description('Apply a session or rollover file to campaign state')
  .argument(
    '[target]',
    'Optional session ID (session-0042) or season ID (1511-autumn)',
  )
  .option('--allow-dirty', 'Allow applying with dirty git state')
  .action(async (target: string | undefined, _opts: unknown, command) => {
    const opts = command.optsWithGlobals();
    await applyHandler({
      allowDirty: opts.allowDirty,
      target,
      mode: 'all',
    });
  });

// `weave apply ap [sessionId]`
applyCommand
  .command('ap')
  .description('Apply Advancement Points for a session')
  .argument(
    '[target]',
    'Optional session ID (session-0042) or season ID (1511-autumn)',
  )
  .option('--allow-dirty', 'Allow applying with dirty git state')
  .action(async (target: string | undefined, _opts: unknown, command) => {
    const opts = command.optsWithGlobals();
    await applyHandler({
      allowDirty: opts.allowDirty,
      target,
      mode: 'ap',
    });
  });

// `weave apply trails [sessionId]`
applyCommand
  .command('trails')
  .description('Apply trail updates for a session')
  .argument(
    '[target]',
    'Optional session ID (session-0042) or season ID (1511-autumn)',
  )
  .option('--allow-dirty', 'Allow applying with dirty git state')
  .action(async (target: string | undefined, _opts: unknown, command) => {
    const opts = command.optsWithGlobals();
    await applyHandler({
      allowDirty: !!opts.allowDirty,
      target,
      mode: 'trails',
    });
  });

weaveCommand.addCommand(applyCommand);

// ---- doctor ----
weaveCommand
  .command('doctor')
  .description('Diagnose campaign state and pending rollovers')
  .action(() => {
    console.log('weave doctor');
    // TODO: implement doctor logic
  });

// ---- plan ----
weaveCommand
  .command('plan')
  .description('Plan application of a session or rollover file')
  .argument(
    '[target]',
    'Optional session ID (session-0042) or season ID (1511-autumn)',
  )
  .action(async (target: string | undefined, _opts: unknown, command) => {
    const opts = command.optsWithGlobals();
    await planHandler({
      allowDirty: !!opts.allowDirty,
      target,
      mode: 'all',
    });
  });

// ---- status ----
weaveCommand
  .command('status')
  .description('Show weave status and unapplied items')
  .argument('[domain]', 'Optional domain to show status for (ap)', 'ap')
  .action(async (domain: string | undefined) => {
    await statusHandler({ mode: domain as 'ap' | undefined });
  });
