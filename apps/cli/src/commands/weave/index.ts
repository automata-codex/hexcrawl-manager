import { Command } from 'commander';

import { allocate as allocateHandler } from './commands/allocate';
import { apply as applyHandler } from './commands/apply';
import { plan as planHandler } from './commands/plan';
import { status as statusHandler } from './commands/status';

export const weaveCommand = new Command('weave').description(
  'Use session and rollover artifacts to update campaign state',
);

// ---- allocate (parent) ----
const allocateCommand = new Command('allocate')
  .description('Allocate Advancement Points (AP) to a character');

// `weave allocate ap <characterId> <amount>`
allocateCommand
  .command('ap')
  .description('Allocate AP to a character')
  .argument('<characterId>', 'Character ID to allocate AP to')
  .argument('<amount>', 'Amount of AP to allocate')
  .option('--note <note>', 'Optional note for the allocation')
  .option('--dry-run', 'Show what would be allocated without making changes')
  .action(async (characterId: string, amount: string, _opts: unknown, command) => {
    const opts = command.optsWithGlobals();
    await allocateHandler({
      characterId,
      amount: Number(amount),
      note: opts.note,
      dryRun: !!opts.dryRun,
    });
  });

weaveCommand.addCommand(allocateCommand);

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
