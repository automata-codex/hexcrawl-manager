import { Command } from 'commander';

export const sessionCommand = new Command('session')
  .description('Bootstrap a new planned session report')
  .action(() => {
    console.log('[session] Command scaffolded. Implementation coming soon.');
  });

