#!/usr/bin/env node

import { Command } from 'commander';
import { scribeCommand } from './commands/scribe';
import pkg from '../package.json' assert { type: 'json' };

const program = new Command();

program
  .name('skyreach')
  .description('CLI tools for managing your Skyreach campaign')
  .version(pkg.version);

// Register commands
program.addCommand(scribeCommand);

// Parse the CLI args
program.parse();
