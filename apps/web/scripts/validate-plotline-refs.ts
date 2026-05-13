#!/usr/bin/env tsx
/**
 * Validate Plotline Cross-References
 *
 * Cross-checks the entities mentioned in each plotline's MDX body against
 * the entities whose own files list this plotline via `plotlines: [<slug>]`.
 * Flags:
 *
 *   - missing back-reference   — entity in body, not in entity's `plotlines`
 *   - stale back-reference     — entity's `plotlines` has us, body doesn't
 *   - unresolved body mention  — a name in the body matches no entity
 *
 * Strictness gate: warnings-only by default. Set `ACHM_STRICT_PLOTLINE_REFS=1`
 * to fail the build on any mismatch. Flip the gate once the content backfill
 * is complete.
 *
 * Usage:
 *   tsx scripts/validate-plotline-refs.ts
 *   ACHM_STRICT_PLOTLINE_REFS=1 tsx scripts/validate-plotline-refs.ts
 */

import { resolveDataPath } from '@achm/data';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';

import {
  analyzePlotlineRefs,
  formatReport,
  type CharacterEntity,
  type FactionEntity,
  type NpcEntity,
  type PlotlineFile,
} from './plotline-refs-analyzer.js';

function parseFrontmatter<T>(content: string): { frontmatter: T; body: string } | null {
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

function loadEntityCollection<T>(dir: string, extensions: readonly string[]): T[] {
  if (!existsSync(dir)) return [];
  const out: T[] = [];
  for (const file of readdirSync(dir)) {
    if (!extensions.some((ext) => file.endsWith(ext))) continue;
    const raw = readFileSync(join(dir, file), 'utf-8');
    const parsed = parseFrontmatter<T>(raw);
    if (parsed) out.push(parsed.frontmatter);
  }
  return out;
}

function loadPlotlineFiles(dir: string): PlotlineFile[] {
  if (!existsSync(dir)) return [];
  const out: PlotlineFile[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
    const raw = readFileSync(join(dir, file), 'utf-8');
    const parsed = parseFrontmatter<{ slug?: string; title?: string }>(raw);
    if (!parsed) continue;
    const { slug, title } = parsed.frontmatter;
    if (!slug || !title) continue;
    out.push({ slug, title, body: parsed.body });
  }
  return out;
}

function main(): void {
  console.log('Validating plotline back-references...\n');

  const plotlines = loadPlotlineFiles(resolveDataPath('plotlines'));
  const npcs = loadEntityCollection<NpcEntity>(
    resolveDataPath('npcs'),
    ['.yaml', '.yml', '.md', '.mdx'],
  );
  const factions = loadEntityCollection<FactionEntity>(
    resolveDataPath('factions'),
    ['.yaml', '.yml'],
  );
  const characters = loadEntityCollection<CharacterEntity>(
    resolveDataPath('characters'),
    ['.yaml', '.yml'],
  );

  const warnings = analyzePlotlineRefs({ plotlines, npcs, factions, characters });

  if (warnings.length === 0) {
    console.log('All plotline back-references are in sync.\n');
    process.exit(0);
  }

  console.warn(formatReport(warnings));

  const strict = process.env.ACHM_STRICT_PLOTLINE_REFS === '1';
  if (strict) {
    console.error(
      `${warnings.length} plotline back-reference warning(s). Strict mode: build fails.\n`,
    );
    process.exit(1);
  }
  console.warn(
    `${warnings.length} plotline back-reference warning(s). Build continues. ` +
      `Set ACHM_STRICT_PLOTLINE_REFS=1 to fail the build on these.\n`,
  );
  process.exit(0);
}

main();
