#!/usr/bin/env node

import { Command } from 'commander';
import { addTrailCommand } from './commands/add-trail';
import { scribeCommand } from './commands/scribe';

const program = new Command();

program
  .name('skyreach')
  .description('CLI tools for managing your Skyreach campaign')
  .version('0.1.0');

// Register subcommands
program.addCommand(addTrailCommand);
program.addCommand(scribeCommand);

// Parse the CLI args
program.parse();
