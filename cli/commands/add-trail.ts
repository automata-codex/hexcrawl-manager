import { Command } from 'commander';
import enquirer from 'enquirer';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { getRepoPath } from '../../lib/repo/get-repo-path.ts';
import { campaignDate } from '../../src/config/campaign-date';
import type { TrailData } from '../../src/types';
import { TrailSchema } from '../../schemas/trail';

function normalizeHex(hex: string): string {
  return hex.trim().toLowerCase();
}

function getSortedHexPair(a: string, b: string): [string, string] {
  const [ha, hb] = [normalizeHex(a), normalizeHex(b)];
  return ha < hb ? [ha, hb] : [hb, ha];
}

function getTrailFilePath(from: string, to: string): string {
  const [a, b] = getSortedHexPair(from, to);
  return getRepoPath('data', 'trails', `${a}-${b}.yml`);
}

function formatInWorldDate(): string {
  const { day, month, year } = campaignDate.currentDate;
  return `${day} ${month} ${year}`;
}

async function promptForTrail(): Promise<TrailData> {
  const inWorldToday = formatInWorldDate();

  const responses = await enquirer.prompt<{
    from: string;
    to: string;
    uses: number;
    isMarked: boolean;
    lastUsed: string;
  }>([
    {
      type: 'input',
      name: 'from',
      message: 'From hex (e.g., T15):',
      validate: (val) => /^[a-zA-Z]\d+$/.test(val) || 'Invalid hex ID'
    },
    {
      type: 'input',
      name: 'to',
      message: 'To hex (e.g., T16):',
      validate: (val) => /^[a-zA-Z]\d+$/.test(val) || 'Invalid hex ID'
    },
    {
      type: 'numeral',
      name: 'uses',
      message: 'Number of uses:',
      initial: 1,
      float: false,
      min: 0
    },
    {
      type: 'confirm',
      name: 'isMarked',
      message: 'Is this a marked trail?',
      initial: false
    },
    {
      type: 'input',
      name: 'lastUsed',
      message: `Last used date (e.g., "15 Aestara 1511", leave blank for today):`,
      initial: inWorldToday
    }
  ]);

  // Normalize and sort the hexes
  const [from, to] = getSortedHexPair(responses.from, responses.to);

  const trail: TrailData = {
    from,
    to,
    uses: responses.uses,
    isMarked: responses.isMarked,
    lastUsed: responses.lastUsed?.trim() || inWorldToday
  };

  const validated = TrailSchema.safeParse(trail);
  if (!validated.success) {
    console.error('❌ Validation error:', validated.error.format());
    process.exit(1);
  }

  return trail;
}

export const addTrailCommand = new Command('add-trail')
  .description('Create or update a trail between two hexes')
  .action(async () => {
    const trail = await promptForTrail();
    const filePath = getTrailFilePath(trail.from, trail.to);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, yaml.stringify(trail), 'utf-8');
    console.log(`✅ Trail saved to ${filePath}`);
  });
