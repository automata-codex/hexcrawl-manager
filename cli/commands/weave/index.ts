import { Command } from 'commander';

export const weaveCommand = new Command('weave')
  .description('Apply session and rollover artifacts to campaign state')
  .command('apply [file]')
  .description('Apply a session or rollover file to campaign state')
  .option('--allow-dirty', 'Allow applying with dirty git state')
  .action((file, opts) => {
    console.log('weave apply', file, opts);
    // TODO: implement apply logic
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
  .action((file) => {
    console.log('weave plan', file);
    // TODO: implement plan logic
  })
  .parent!
  .command('status')
  .description('Show weave status and unapplied items')
  .action(() => {
    console.log('weave status');
    // TODO: implement status logic
  });

