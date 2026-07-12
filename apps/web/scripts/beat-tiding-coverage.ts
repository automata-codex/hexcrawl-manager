#!/usr/bin/env tsx
/**
 * Beat Tiding Coverage
 *
 * Global completeness backstop for faction tidings: lists every live beat
 * (status pending/active, campaign-active) that is surfaced by no faction
 * tiding — i.e. whose compound `<plotlineSlug>/<beatSlug>` id appears in no
 * `linkType: 'beat'` row across any roleplay book's intelligence reports
 * (rolled or selectable).
 *
 * This is the "don't forget" signal; the faction tidings aid
 * (`faction-tidings-aid.ts`) is the ergonomic way to work the list down.
 * In particular this catches what the aid structurally misses: beats that
 * are faction-untagged, named obliquely in plotline bodies, or whose
 * factions have no roleplay book.
 *
 * Warnings-only: always exits 0. A strict env gate (mirroring
 * ACHM_STRICT_PLOTLINE_REFS) can be added later if CI should enforce
 * coverage — logged, not built.
 *
 * Usage:
 *   tsx scripts/beat-tiding-coverage.ts
 */

import { resolveDataPath } from '@achm/data';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';

import {
  analyzeBeatTidingCoverage,
  formatCoverageReport,
  type CoverageBook,
  type TidingRow,
} from './beat-tiding-analyzer.js';
import { type TidingsBeatFile } from './faction-tidings-analyzer.js';

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

interface BeatFrontmatter {
  title?: string;
  status?: string;
  campaignStatus?: string;
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
      });
    }
  }
  return out;
}

interface RawRoleplayBook {
  name?: string;
  intelligenceReports?: {
    rows?: TidingRow[];
    situational?: TidingRow[];
  };
}

function loadRoleplayBooks(dir: string): CoverageBook[] {
  if (!existsSync(dir)) return [];
  const out: CoverageBook[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
    let raw: RawRoleplayBook;
    try {
      raw = yaml.parse(
        readFileSync(join(dir, file), 'utf-8'),
      ) as RawRoleplayBook;
    } catch {
      continue;
    }
    out.push({
      name: raw.name ?? file,
      rows: raw.intelligenceReports?.rows ?? [],
      situational: raw.intelligenceReports?.situational ?? [],
    });
  }
  return out;
}

function main(): void {
  console.log('Checking beat tiding coverage...\n');

  const beats = loadBeatFiles(resolveDataPath('plotlines'));
  const books = loadRoleplayBooks(resolveDataPath('roleplay-books'));

  const result = analyzeBeatTidingCoverage(beats, books);

  if (result.orphans.length === 0) {
    console.log(formatCoverageReport(result));
  } else {
    console.warn(formatCoverageReport(result));
  }
  process.exit(0);
}

main();
