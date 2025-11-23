/**
 * Migration script to add `id` and `slug` fields to article frontmatter.
 *
 * - id: derived from file path relative to articles dir (without extension)
 * - slug: URL path from ARTICLE_ROUTES (if article is in routes), otherwise omitted
 *
 * Run with: npx tsx scripts/migrate-article-frontmatter.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTICLES_DIR = path.join(__dirname, '../data/articles');

// Mapping from article file slug to URL path (from ARTICLE_ROUTES in routes.ts)
const ARTICLE_ROUTES_MAP: Record<string, string> = {
  'ancestries-and-cultures': '/players-guide/ancestries-and-cultures',
  biomes: '/gm-reference/biomes',
  'character-advancement': '/players-guide/advancement',
  'character-goals': '/players-guide/character-goals',
  'clues/clues-for-alistar': '/session-toolkit/clues/clues-for-alistar',
  'clues/clues-for-daemaris': '/session-toolkit/clues/clues-for-daemaris',
  'clues/clues-for-thorn': '/session-toolkit/clues/clues-for-thorn',
  'clues/the-drunken-soldier': '/session-toolkit/clues/drunken-soldier',
  'clues/twin-sigils': '/session-toolkit/clues/twin-sigils',
  'crystals/crystal-reference': '/gm-reference/first-civilization/crystal-reference',
  'crystals/crystals': '/gm-reference/first-civilization/crystals',
  'early-frontier': '/gm-reference/setting/early-frontier',
  'first-civ/airships': '/gm-reference/first-civilization/airships',
  'first-civ/catastrophe-and-aftermath':
    '/gm-reference/first-civilization/catastrophe-and-aftermath',
  'first-civ/first-civilization-demographics':
    '/gm-reference/first-civilization/demographics',
  'first-civ/skyspire/materials-and-zones':
    '/gm-reference/first-civilization/skyspire-materials-and-zones',
  'first-civ/skyspire/original-zones':
    '/gm-reference/first-civilization/skyspire-original-zones',
  'first-civ/skyspire/skyspire': '/gm-reference/first-civilization/the-skyspire',
  'first-civ/skyspire/skyspire-occupations':
    '/gm-reference/first-civilization/skyspire-occupations',
  'first-civ/skyspire/terrain': '/gm-reference/first-civilization/skyspire-terrain',
  'first-civ/velari': '/gm-reference/first-civilization/the-velari',
  'glinting-steps-map': '/players-reference/setting/glinting-steps-map',
  glossary: '/gm-reference/glossary',
  'griffon-hunt': '/session-toolkit/minigames/griffon-hunt',
  'hexcrawl-rules/hexcrawl-rules': '/players-reference/rules/hexcrawl-rules',
  'hexcrawl-rules/quick-reference': '/session-toolkit/hexcrawl-quick-reference',
  'house-rules': '/players-reference/rules/house-rules',
  'kobold-caves': '/session-toolkit/maps/kobold-caves',
  'npcs/magister-ulrich-verrian': '/session-toolkit/npcs/magister-ulrich-verrian',
  'puzzles/gearforged-hermit': '/gm-reference/puzzles/gearforged-hermit',
  'puzzles/pillars-of-witness': '/gm-reference/puzzles/pillars-of-witness',
  'region-budget-guidelines': '/gm-reference/region-budget-guidelines',
  retcons: '/players-reference/retcons',
  'scaling-encounters': '/session-toolkit/scaling-encounters',
  'scar-sites': '/session-toolkit/scar-sites',
  timeline: '/session-toolkit/timeline',
  'western-frontier': '/players-reference/setting/western-frontier',
  'western-frontier-gms-notes': '/gm-reference/western-frontier-gms-notes',
  'winter-1512/downtime-activities-gm-reference':
    '/gm-reference/winter-1512/downtime-activities-gm-reference',
  'winter-1512/downtime-activities-player-reference':
    '/players-reference/winter-1512/downtime-activities-player-reference',
  'winter-1512/hunting-soldier-roster':
    '/gm-reference/winter-1512/hunting-soldier-roster',
  'winter-1512/hunting-soldier-roster-player-facing':
    '/players-reference/winter-1512/hunting-soldier-roster',
  'winter-1512/index': '/gm-reference/winter-1512',
  'winter-1512/investigation-framework':
    '/gm-reference/winter-1512/investigation-framework',
  'winter-1512/npc-quick-reference': '/gm-reference/winter-1512/npc-quick-reference',
  'winter-1512/npc-roster': '/gm-reference/winter-1512/npc-roster',
  'winter-1512/off-site-granaries': '/gm-reference/winter-1512/off-site-granaries',
  'winter-1512/players-guide': '/players-reference/winter-1512',
  'winter-1512/rumor-system': '/gm-reference/winter-1512/rumor-system',
  'winter-1512/winter-rules-outline': '/gm-reference/winter-1512/winter-rules-outline',
};

function getAllArticleFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllArticleFiles(fullPath, baseDir));
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }

  return files;
}

function getArticleId(filePath: string): string {
  const relativePath = path.relative(ARTICLES_DIR, filePath);
  // Remove extension and normalize path separators
  return relativePath.replace(/\.(md|mdx)$/, '').replace(/\\/g, '/');
}

/**
 * Injects id and slug into frontmatter without parsing the YAML.
 * This preserves complex frontmatter structures.
 */
function injectFrontmatterFields(
  content: string,
  id: string,
  slug: string | undefined,
): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error('No frontmatter found');
  }

  const [, frontmatterRaw, body] = match;

  // Check if already has id
  if (/^id:/m.test(frontmatterRaw)) {
    return content; // Already migrated
  }

  // Build new lines to inject
  const newLines: string[] = [`id: ${id}`];
  if (slug) {
    newLines.push(`slug: ${slug}`);
  }

  // Inject after the opening ---
  const newFrontmatter = newLines.join('\n') + '\n' + frontmatterRaw;

  return `---\n${newFrontmatter}\n---\n${body}`;
}

function hasFrontmatter(content: string): boolean {
  return /^---\n[\s\S]*?\n---\n/.test(content);
}

function hasIdField(content: string): boolean {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return false;
  return /^id:/m.test(match[1]);
}

function migrateArticle(filePath: string, dryRun: boolean = false): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const articleId = getArticleId(filePath);

  // Skip files starting with underscore (partials)
  if (path.basename(filePath).startsWith('_')) {
    console.log(`SKIP (partial): ${articleId}`);
    return;
  }

  // Check for frontmatter
  if (!hasFrontmatter(content)) {
    console.log(`SKIP (no frontmatter): ${articleId}`);
    return;
  }

  // Check if already migrated
  if (hasIdField(content)) {
    console.log(`SKIP (already has id): ${articleId}`);
    return;
  }

  // Get slug if in routes
  const urlPath = ARTICLE_ROUTES_MAP[articleId];

  if (dryRun) {
    console.log(`WOULD UPDATE: ${articleId}`);
    console.log(`  id: ${articleId}`);
    if (urlPath) {
      console.log(`  slug: ${urlPath}`);
    }
  } else {
    const newContent = injectFrontmatterFields(content, articleId, urlPath);
    fs.writeFileSync(filePath, newContent);
    console.log(`UPDATED: ${articleId}${urlPath ? ` -> ${urlPath}` : ''}`);
  }
}

// Main
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('=== DRY RUN MODE ===\n');
}

const articleFiles = getAllArticleFiles(ARTICLES_DIR);
console.log(`Found ${articleFiles.length} article files\n`);

for (const file of articleFiles.sort()) {
  migrateArticle(file, dryRun);
}

console.log('\nDone!');
