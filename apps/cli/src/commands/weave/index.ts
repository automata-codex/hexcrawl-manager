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
  .argument('[sessionId]', 'Optional session id, e.g. session-0042')
  .option('--allow-dirty', 'Allow applying with dirty git state')
  .action(
    async (sessionId: string | undefined, opts: { allowDirty?: boolean }) => {
      await applyHandler({
        allowDirty: opts.allowDirty,
        sessionId,
        mode: 'all',
      });
    },
  );

// `weave apply ap [sessionId]`
applyCommand
  .command('ap')
  .description('Apply Advancement Points for a session')
  .argument('[sessionId]', 'Optional session id, e.g. session-0042')
  .option('--allow-dirty', 'Allow applying with dirty git state')
  .action(
    async (sessionId: string | undefined, opts: { allowDirty?: boolean }) => {
      await applyHandler({
        allowDirty: opts.allowDirty,
        sessionId,
        mode: 'ap',
      });
    },
  );

// `weave apply trails [sessionId]`
applyCommand
  .command('trails')
  .description('Apply trail updates for a session')
  .argument('[sessionId]', 'Optional session id, e.g. session-0042')
  .option('--allow-dirty', 'Allow applying with dirty git state')
  .action(
    async (sessionId: string | undefined, opts: { allowDirty?: boolean }) => {
      await applyHandler({
        allowDirty: opts.allowDirty,
        sessionId,
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
  .argument('[sessionId]', 'Optional session id, e.g. session-0042')
  .action(async (sessionId: string | undefined) => {
    await plan(sessionId);
  });

// ---- status ----
weaveCommand
  .command('status')
  .description('Show weave status and unapplied items')
  .action(() => {
    console.log('weave status');
    // TODO: implement status logic
  });
