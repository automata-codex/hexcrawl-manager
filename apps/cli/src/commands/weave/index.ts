import { Command } from 'commander';

import { apCommand } from './commands/ap';
import { apply as applyHandler } from './commands/apply';
import { plan } from './commands/plan';

export const weaveCommand = new Command('weave').description(
  'Use session and rollover artifacts to update campaign state',
);

// ---- existing sub-tree ----
weaveCommand.addCommand(apCommand);

// ---- apply (parent) ----
// `weave apply [sessionId]` -> defaults to AP application
const applyCommand = new Command('apply')
  .description('Apply a session or rollover file to campaign state')
  .argument('[target]', 'Optional session ID (session-0042) or season ID (1511-autumn)')
  .option('--allow-dirty', 'Allow applying with dirty git state')
  .action(
    async (target: string | undefined, opts: { allowDirty?: boolean }) => {
      await applyHandler({
        allowDirty: opts.allowDirty,
        target,
        mode: 'all',
      });
    },
  );

// `weave apply ap [sessionId]`
applyCommand
  .command('ap')
  .description('Apply Advancement Points for a session')
  .argument('[target]', 'Optional session ID (session-0042) or season ID (1511-autumn)')
  .option('--allow-dirty', 'Allow applying with dirty git state')
  .action(
    async (target: string | undefined, opts: { allowDirty?: boolean }) => {
      await applyHandler({
        allowDirty: opts.allowDirty,
        target,
        mode: 'ap',
      });
    },
  );

// `weave apply trails [sessionId]`
applyCommand
  .command('trails')
  .description('Apply trail updates for a session')
  .argument('[target]', 'Optional session ID (session-0042) or season ID (1511-autumn)')
  .option('--allow-dirty', 'Allow applying with dirty git state')
  .action(
    // TODO All the other handlers need to be updated with this pattern
    async (target: string | undefined, _opts: unknown, command) => {
      const opts = command.optsWithGlobals();
      await applyHandler({
        allowDirty: !!opts.allowDirty,
        target,
        mode: 'trails',
      });
    },
  );

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
  .argument('[target]', 'Optional session ID (session-0042) or season ID (1511-autumn)')
  .action(async (target: string | undefined) => {
    await plan(target); // TODO Make sure this function can handle session ID and season ID
  });

// ---- status ----
weaveCommand
  .command('status')
  .description('Show weave status and unapplied items')
  .action(() => {
    console.log('weave status');
    // TODO: implement status logic
  });
