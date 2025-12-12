/**
 * Migration script to convert floating clues to the unified clue format.
 * Drops extraneous fields not in the ClueSchema (reference, unlocks, fallback, encounters).
 *
 * Usage: npx tsx scripts/migrate-floating-clues.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const FLOATING_CLUES_DIR = path.join(process.cwd(), 'data/floating-clues');
const CLUES_DIR = path.join(process.cwd(), 'data/clues');

interface FloatingClue {
  id: string;
  name: string;
  summary: string;
  detailText?: string;
  tags?: string[];
  status: 'undiscovered' | 'revealed' | 'expired';
  // Fields that will be dropped:
  // reference, unlocks, fallback, encounters
}

interface Clue {
  id: string;
  name: string;
  summary: string;
  details?: string;
  factions?: string[];
  plotlines?: string[];
  tags?: string[];
  status: 'unknown' | 'known';
}

function mapStatus(
  floatingStatus: 'undiscovered' | 'revealed' | 'expired'
): 'unknown' | 'known' {
  switch (floatingStatus) {
    case 'undiscovered':
    case 'expired': // Map expired to unknown (clue system doesn't have expired)
      return 'unknown';
    case 'revealed':
      return 'known';
    default:
      return 'unknown';
  }
}

function convertFloatingClue(floating: FloatingClue): Clue {
  const clue: Clue = {
    id: floating.id,
    name: floating.name,
    summary: floating.summary,
    status: mapStatus(floating.status),
  };

  // Map detailText to details
  if (floating.detailText) {
    clue.details = floating.detailText;
  }

  // Only copy tags (other fields like reference, unlocks, fallback, encounters are dropped)
  if (floating.tags && floating.tags.length > 0) {
    clue.tags = floating.tags;
  }

  return clue;
}

function main() {
  // Ensure clues directory exists
  if (!fs.existsSync(CLUES_DIR)) {
    fs.mkdirSync(CLUES_DIR, { recursive: true });
  }

  // Get all floating clue files
  const files = fs.readdirSync(FLOATING_CLUES_DIR).filter((f) => f.endsWith('.yml'));

  console.log(`Found ${files.length} floating clue files to migrate\n`);

  let migrated = 0;
  let skipped = 0;

  for (const file of files) {
    const sourcePath = path.join(FLOATING_CLUES_DIR, file);
    const targetPath = path.join(CLUES_DIR, file.replace('.yml', '.yaml'));

    // Check if target already exists
    if (fs.existsSync(targetPath)) {
      console.log(`⏭️  Skipping ${file} - already exists at ${path.basename(targetPath)}`);
      skipped++;
      continue;
    }

    // Read and parse floating clue
    const content = fs.readFileSync(sourcePath, 'utf-8');
    const floating = yaml.parse(content) as FloatingClue;

    // Convert to new format
    const clue = convertFloatingClue(floating);

    // Write as YAML with consistent formatting
    const yamlContent = yaml.stringify(clue, {
      lineWidth: 0, // Don't wrap lines
      defaultStringType: 'PLAIN',
      defaultKeyType: 'PLAIN',
    });

    fs.writeFileSync(targetPath, yamlContent);
    console.log(`✅ Migrated ${file} → ${path.basename(targetPath)}`);
    migrated++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Total:    ${files.length}`);
}

main();
