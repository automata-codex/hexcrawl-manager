#!/usr/bin/env tsx
/**
 * Faction Tidings Authoring Aid
 *
 * Per-faction surfacing convenience for authoring faction tidings: lists the
 * live beats and clues under a faction so they can be turned into curated
 * tiding rows. For each faction the plotline set is the union of the
 * faction's explicit `plotlines` field and plotlines whose body mentions the
 * faction; beats and clues then surface either directly (the item's own
 * `factions` field) or transitively through that plotline set, tagged with
 * how they surfaced.
 *
 * Over-inclusive on purpose — better to show a via-plotline item you then
 * judge irrelevant than to miss one. The beat-tiding coverage tool is the
 * global completeness backstop. Read-only: never writes status.
 *
 * Usage:
 *   tsx scripts/faction-tidings-aid.ts              # all factions
 *   tsx scripts/faction-tidings-aid.ts gruelith     # one faction
 */

import { resolveDataPath } from '@achm/data';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';

import {
  formatThreadsReport,
  gatherAllFactionThreads,
  gatherFactionThreads,
  type FactionThreads,
  type TidingsBeatFile,
  type TidingsClueEntity,
  type TidingsFactionEntity,
  type TidingsPlotlineFile,
} from './faction-tidings-analyzer.js';

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

function loadEntityCollection<T>(
  dir: string,
  extensions: readonly string[],
): T[] {
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

function loadPlotlineFiles(dir: string): TidingsPlotlineFile[] {
  if (!existsSync(dir)) return [];
  const out: TidingsPlotlineFile[] = [];
  for (const entry of readdirSync(dir)) {
    const plotlineDir = join(dir, entry);
    if (!statSync(plotlineDir).isDirectory()) continue;
    for (const file of readdirSync(plotlineDir)) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
      const raw = readFileSync(join(plotlineDir, file), 'utf-8');
      const parsed = parseFrontmatter<{ slug?: string; title?: string }>(raw);
      if (!parsed) continue;
      const { slug, title } = parsed.frontmatter;
      if (!slug || !title) continue;
      out.push({ slug, title, body: parsed.body });
    }
  }
  return out;
}

interface BeatFrontmatter {
  title?: string;
  status?: string;
  campaignStatus?: string;
  factions?: string[];
}

function loadBeatFiles(plotlinesDir: string): TidingsBeatFile[] {
  if (!existsSync(plotlinesDir)) return [];
  const out: TidingsBeatFile[] = [];
  for (const entry of readdirSync(plotlinesDir)) {
    const plotlineDir = join(plotlinesDir, entry);
    if (!statSync(plotlineDir).isDirectory()) continue;
    const beatsDir = join(plotlineDir, 'beats');
    if (!existsSync(beatsDir) || !statSync(beatsDir).isDirectory()) continue;
    for (const file of readdirSync(beatsDir)) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
      const slug = file.replace(/\.(md|mdx)$/, '');
      const raw = readFileSync(join(beatsDir, file), 'utf-8');
      const parsed = parseFrontmatter<BeatFrontmatter>(raw);
      const fm = parsed?.frontmatter ?? {};
      out.push({
        slug,
        parentPlotlineSlug: entry,
        title: fm.title ?? slug,
        status: fm.status,
        campaignStatus: fm.campaignStatus,
        factions: fm.factions,
      });
    }
  }
  return out;
}

function main(): void {
  const factionIdArg = process.argv[2];

  const plotlinesDir = resolveDataPath('plotlines');
  const input = {
    factions: loadEntityCollection<TidingsFactionEntity>(
      resolveDataPath('factions'),
      ['.yaml', '.yml'],
    ),
    plotlines: loadPlotlineFiles(plotlinesDir),
    beats: loadBeatFiles(plotlinesDir),
    clues: loadEntityCollection<TidingsClueEntity>(resolveDataPath('clues'), [
      '.yaml',
      '.yml',
    ]),
  };

  let threads: FactionThreads[];
  if (factionIdArg) {
    if (!input.factions.some((f) => f.id === factionIdArg)) {
      console.error(`Unknown faction id: ${factionIdArg}`);
      console.error(
        `Available: ${input.factions
          .map((f) => f.id)
          .sort()
          .join(', ')}`,
      );
      process.exit(1);
    }
    threads = [gatherFactionThreads(input, factionIdArg)];
  } else {
    threads = gatherAllFactionThreads(input);
  }

  console.log(formatThreadsReport(threads));
  process.exit(0);
}

main();
