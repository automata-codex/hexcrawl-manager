import { REPO_PATHS } from '@skyreach/data';
import { ApLedgerEntry, ApLedgerEntrySchema } from '@skyreach/schemas';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

import { readApLedger } from '../../../../services/ap-ledger.service';
import { aggregateApByCharacter } from '../../lib/aggregate-ap-by-character';
import { computeUnclaimedAbsenceAwards } from '../../lib/compute-unclaimed-absence-awards';

// Command handler for `weave ap status`
export async function apStatus() {
  // Step 1: Get the AP ledger file path
  const ledgerPath = REPO_PATHS.AP_LEDGER();

  // Step 2: Read and parse the AP ledger file
  const ledgerEntriesRaw = readApLedger(ledgerPath);

  // Validate each entry using the schema
  const ledgerEntries: ApLedgerEntry[] = [];
  for (const entry of ledgerEntriesRaw) {
    const parsed = ApLedgerEntrySchema.safeParse(entry);
    if (parsed.success) {
      ledgerEntries.push(parsed.data);
    } else {
      // Optionally, handle or log validation errors
      console.warn('Invalid AP ledger entry found and skipped:', parsed.error);
    }
  }

  // Step 3: Aggregate AP by character and pillar
  const apByCharacter = aggregateApByCharacter(ledgerEntries);

  // Step 4: Print a summary table
  console.log('AP Status by Character:');
  console.log('-------------------------------------------------');
  console.log('Character ID      Combat   Exploration   Social');
  console.log('-------------------------------------------------');
  for (const [characterId, ap] of Object.entries(apByCharacter)) {
    const pad = (s: string, n: number) => s.padEnd(n, ' ');
    console.log(
      `${pad(characterId, 16)}${pad(ap.combat.toString(), 9)}${pad(ap.exploration.toString(), 14)}${pad(ap.social.toString(), 7)}`
    );
  }
  console.log('-------------------------------------------------');

  // --- Compute and print unclaimed absence awards ---
  // Load all character YAML files
  const charDir = REPO_PATHS.CHARACTERS();
  const charFiles = fs.readdirSync(charDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  const characters = charFiles.map(f => {
    const filePath = path.join(charDir, f);
    const raw = fs.readFileSync(filePath, 'utf8');
    return yaml.parse(raw);
  });

  // Load all session YAML files
  const sessionDir = REPO_PATHS.SESSIONS();
  const sessionFiles = fs.readdirSync(sessionDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  const sessions = sessionFiles.map(f => {
    const filePath = path.join(sessionDir, f);
    const raw = fs.readFileSync(filePath, 'utf8');
    return yaml.parse(raw);
  });

  // Compute unclaimed absence awards
  const absenceAwards = computeUnclaimedAbsenceAwards(sessions, characters, ledgerEntries);

  // Print the results
  console.log('\nUnclaimed Absence Awards:');
  console.log('-------------------------------------------------');
  console.log('Character         Eligible  Claimed  Unclaimed');
  console.log('-------------------------------------------------');
  for (const row of absenceAwards) {
    const pad = (s: string, n: number) => s.padEnd(n, ' ');
    console.log(
      `${pad(row.displayName, 17)}${pad(row.eligibleMissed.toString(), 9)}${pad(row.claimed.toString(), 8)}${pad(row.unclaimed.toString(), 10)}`
    );
  }
  console.log('-------------------------------------------------');
}
