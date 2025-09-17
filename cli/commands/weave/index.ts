import { Command } from 'commander';
import { apply } from './commands/apply';
import { plan } from './commands/plan';

export const weaveCommand = new Command('weave')
  .description('Apply session and rollover artifacts to campaign state')
  .command('apply [file]')
  .description('Apply a session or rollover file to campaign state')
  .option('--allow-dirty', 'Allow applying with dirty git state')
  .action(async (file, opts) => {
    await apply(file, opts);
  })
  .parent!
  .command('doctor')
  .description('Diagnose campaign state and pending rollovers')
  .action(() => {
    console.log('weave doctor');
    // TODO: implement doctor logic
  })
  .parent!
  .command('plan [file]')
  .description('Plan application of a session or rollover file')
  .action(async (file) => {
    await plan(file);
  })
  .parent!
  .command('status')
  .description('Show weave status and unapplied items')
  .action(() => {
    console.log('weave status');
    // TODO: implement status logic
  });
