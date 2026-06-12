#!/usr/bin/env tsx
/**
 * Validate Beat Tags
 *
 * Checks every beat's `tags` against the blessed vocabulary in
 * `data/tags.yaml` (the `beat` key). Off-vocabulary tags are reported
 * grouped by tag, so cleanup is one decision per tag: bless it (add to
 * tags.yaml), collapse it (rename to an existing blessed tag), or drop it
 * (delete; if the info matters, it's body prose).
 *
 * A missing tags.yaml or `beat` list is treated as an empty vocabulary —
 * every tag is flagged, which makes the first run the triage worklist.
 *
 * Strictness gate: warnings-only by default. Set `ACHM_STRICT_TAGS=1` to
 * fail the build on any off-vocabulary tag. Flip the gate once the cleanup
 * pass is complete.
 *
 * Usage:
 *   tsx scripts/validate-tags.ts
 *   ACHM_STRICT_TAGS=1 tsx scripts/validate-tags.ts
 */

import { resolveDataPath } from '@achm/data';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';

import {
  analyzeBeatTags,
  formatTagReport,
  parseBeatVocabulary,
  type BeatTagsFile,
} from './tags-analyzer.js';

function parseFrontmatter<T>(
  content: string,
): { frontmatter: T; body: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (match) {
    try {
      const frontmatter = yaml.parse(match[1]) as T;
      return { frontmatter, body: match[2] ?? '' };
    } catch {
      return null;
    }
  }
  try {
    return { frontmatter: yaml.parse(content) as T, body: '' };
  } catch {
    return null;
  }
}

function loadBeatFiles(plotlinesDir: string): BeatTagsFile[] {
  if (!existsSync(plotlinesDir)) return [];
  const out: BeatTagsFile[] = [];
  for (const entry of readdirSync(plotlinesDir)) {
    const plotlineDir = join(plotlinesDir, entry);
    if (!statSync(plotlineDir).isDirectory()) continue;
    const beatsDir = join(plotlineDir, 'beats');
    if (!existsSync(beatsDir) || !statSync(beatsDir).isDirectory()) continue;
    for (const file of readdirSync(beatsDir)) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
      const slug = file.replace(/\.(md|mdx)$/, '');
      const raw = readFileSync(join(beatsDir, file), 'utf-8');
      const parsed = parseFrontmatter<{ tags?: string[] }>(raw);
      out.push({
        slug,
        parentPlotlineSlug: entry,
        tags: parsed?.frontmatter.tags,
      });
    }
  }
  return out;
}

function loadVocabulary(tagsPath: string): Set<string> {
  if (!existsSync(tagsPath)) {
    console.warn(
      `No tags.yaml found at ${tagsPath} — treating the beat vocabulary as empty.\n`,
    );
    return new Set();
  }
  let doc: unknown;
  try {
    doc = yaml.parse(readFileSync(tagsPath, 'utf-8'));
  } catch {
    console.warn(
      `Could not parse ${tagsPath} — treating the beat vocabulary as empty.\n`,
    );
    return new Set();
  }
  const vocabulary = parseBeatVocabulary(doc);
  if (vocabulary === null) {
    console.warn(
      `${tagsPath} has no \`beat\` tag list — treating the beat vocabulary as empty.\n`,
    );
    return new Set();
  }
  return new Set(vocabulary);
}

function main(): void {
  console.log('Validating beat tags against the blessed vocabulary...\n');

  const vocabulary = loadVocabulary(resolveDataPath('tags.yaml'));
  const beats = loadBeatFiles(resolveDataPath('plotlines'));

  const warnings = analyzeBeatTags(beats, vocabulary);

  if (warnings.length === 0) {
    console.log('All beat tags are in the blessed vocabulary.\n');
    process.exit(0);
  }

  console.warn(formatTagReport(warnings));

  const useCount = warnings.reduce((n, w) => n + w.beatIds.length, 0);
  const summary = `${warnings.length} off-vocabulary beat tag(s) across ${useCount} use(s).`;
  const strict = process.env.ACHM_STRICT_TAGS === '1';
  if (strict) {
    console.error(`${summary} Strict mode: build fails.\n`);
    process.exit(1);
  }
  console.warn(
    `${summary} Build continues. Set ACHM_STRICT_TAGS=1 to fail the build on these.\n`,
  );
  process.exit(0);
}

main();
