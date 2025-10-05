import { Command } from 'commander';

import { apApply } from './ap-apply';
import { apStatus } from './ap-status';

export const apCommand = new Command('ap')
  .description('AP management commands');

apCommand
  .command('apply [sessionId]')
  .description('Apply AP changes from a finalize session log')
  .action(async (sessionId) => {
    await apApply(sessionId);
  });

apCommand
  .command('status')
  .description('Show current AP ledger status')
  .action(async () => {
    await apStatus();
  });
