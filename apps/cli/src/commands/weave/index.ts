import { Command, Option } from 'commander';

import {
  allocateAbsenceFromCli as allocateAbsenceHandler,
  allocateMilestoneFromCli as allocateMilestoneHandler,
} from './commands/allocate';
import { apply as applyHandler } from './commands/apply';
import { plan as planHandler } from './commands/plan';
import { status as statusHandler } from './commands/status';

export const weaveCommand = new Command('weave').description(
  'Use session and rollover artifacts to update campaign state',
);

// ---- allocate (parent) ----
const allocateCommand = new Command('allocate').description(
  'Allocate Advancement Points (AP) to a character',
);

// `weave allocate ap` -> parent with subcommands
const allocateAp = new Command('ap').description(
  'Allocate AP to one or more characters',
);

// `weave allocate ap absence` -> allocate absence credits
const allocateApAbsence = new Command('absence')
  .description('Spend unclaimed absence credits')
  .addOption(
    new Option(
      '--character <id>',
      'Character ID (starts a new allocation block)',
    ),
  )
  .addOption(
    new Option('--amount <n>', 'Total credits to allocate in this block'),
  )
  .addOption(new Option('--combat <n>', 'Combat pillar credits for this block'))
  .addOption(
    new Option(
      '--exploration <n>',
      'Exploration pillar credits for this block',
    ),
  )
  .addOption(new Option('--social <n>', 'Social pillar credits for this block'))
  .option('--note <text>', 'Optional note for the current block')
  .option('--dry-run', 'Show what would be allocated without making changes')
  .addHelpText(
    'after',
    `
Examples:
  # Spend N credits for a Tier-1 character, mapping credits to pillars explicitly
  weave allocate ap absence --character <id> --amount 3 --combat 1 --exploration 2 --note "Missed 0021"

  # Multiple characters (repeat flags per character)
  weave allocate ap absence \\
    --character <id1> --amount 2 --social 2 \\
    --character <id2> --amount 1 --exploration 1

Notes:
  • Each --character begins a new allocation block.
  • If any pillar flags are present in a block, their sum must equal --amount.
  • --dry-run applies to all blocks.
`,
  )
  .allowUnknownOption(true)
  .action(async (_opts, command) => {
    const opts = command.optsWithGlobals();
    const raw = process.argv;
    const tokens = sliceAfterThisCommand(raw, command);

    if (tokens.length === 0) {
      command.help({ error: false });
      return;
    }

    await allocateAbsenceHandler(raw, !!opts.dryRun);
  });

// `weave allocate ap milestone` -> stage milestone allocation in a session report
const allocateApMilestone = new Command('milestone')
  .description(
    'Stage a milestone allocation in a session report (committed by `weave apply ap`)',
  )
  .addOption(
    new Option(
      '--character <id>',
      'Character ID (starts a new allocation block)',
    ),
  )
  .addOption(
    new Option(
      '--session-id <id>',
      'Session ID this milestone is tied to (e.g. session-0023)',
    ),
  )
  .addOption(new Option('--combat <n>', 'Combat pillar credits'))
  .addOption(new Option('--exploration <n>', 'Exploration pillar credits'))
  .addOption(new Option('--social <n>', 'Social pillar credits'))
  .option('--note <text>', 'Milestone description')
  .option('--dry-run', 'Show what would be staged without writing the report')
  .addHelpText(
    'after',
    `
Examples:
  # Stage a milestone for a character whose pillar AP for the session sums to 2
  # (topup is 1; split must sum to exactly 1)
  weave allocate ap milestone --character <id> --session-id session-0023 \\
    --combat 1 --exploration 0 --social 0 --note "Winter survival"

  # Multiple characters in the same session (repeat flags per character)
  weave allocate ap milestone \\
    --character <id1> --session-id session-0023 --combat 1 --exploration 0 --social 0 \\
    --character <id2> --session-id session-0023 --combat 0 --exploration 2 --social 0

Notes:
  • Each --character begins a new allocation block; --session-id is required per block.
  • Splits sum to between 0 and 3. If pillar AP for the session is already in the ledger,
    the sum must equal exactly (3 − pillarTotal); otherwise validation is deferred to
    \`weave apply ap\`.
  • Allocations are staged in the session report's milestoneAllocations[] field;
    \`weave apply ap\` writes the corresponding milestone_spend ledger entries.
  • Re-allocating for the same (character, session) is an error — hand-edit the report
    to revise.
  • --dry-run applies to all blocks.
`,
  )
  .allowUnknownOption(true)
  .action(async (_opts, command) => {
    const opts = command.optsWithGlobals();
    const raw = process.argv;
    const tokens = sliceAfterThisCommand(raw, command);

    if (tokens.length === 0) {
      command.help({ error: false });
      return;
    }

    await allocateMilestoneHandler(raw, !!opts.dryRun);
  });

allocateAp.addCommand(allocateApAbsence);
allocateAp.addCommand(allocateApMilestone);
allocateCommand.addCommand(allocateAp);
weaveCommand.addCommand(allocateCommand);

// --- helper kept local to CLI so help works even without importing orchestrator utils ---
function sliceAfterThisCommand(rawArgs: string[], command: Command): string[] {
  // Prefer the real runtime name of this command
  const token = command.name(); // 'ap'
  // Some setups add a path or alias; last occurrence is safest
  const idx = rawArgs.lastIndexOf(token);
  if (idx !== -1) return rawArgs.slice(idx + 1);

  // Fallback: chop off "node cli.js"
  if (rawArgs.length >= 2) return rawArgs.slice(2);

  return [];
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
