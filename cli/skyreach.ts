#!/usr/bin/env node

import { Command } from 'commander';

import pkg from '../package.json' assert { type: 'json' };

import { scribeCommand } from './commands/scribe';
import { weaveCommand } from './commands/weave';

const program = new Command();

program
  .name('skyreach')
  .description('CLI tools for managing your Skyreach campaign')
  .version(pkg.version);

// Register commands
program.addCommand(scribeCommand);
program.addCommand(weaveCommand);

// Parse the CLI args
program.parse();
