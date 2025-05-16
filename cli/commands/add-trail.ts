import { Command } from 'commander';

export const addTrailCommand = new Command('add-trail')
  .description('Create or update a trail segment between two hexes')
  .action(() => {
    console.log('✨ [stub] add-trail CLI will go here');
  });
