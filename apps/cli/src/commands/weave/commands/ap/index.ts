import { Command } from 'commander';

import { apStatus } from './ap-status';

export const apCommand = new Command('ap')
  .description('AP management commands');

apCommand
  .command('status')
  .description('Show current AP ledger status')
  .action(async () => {
    await apStatus();
  });
