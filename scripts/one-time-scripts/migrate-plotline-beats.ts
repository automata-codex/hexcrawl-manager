/**
 * Migration: extract inline plotline beats into standalone beat files at
 * `data/plotlines/<plotline-slug>/beats/<beat-slug>.md`.
 *
 * Plan -> validate -> write atomic. Nothing is written until the entire
 * plan is valid for every affected plotline.
 *
 * Field names are preserved verbatim (`factions`, `notes`, etc.). The
 * standalone `BeatSchema` reconciliation is a separate change.
 *
 * Run with:
 *   npx tsx --env-file=.env scripts/one-time-scripts/migrate-plotline-beats.ts [--dry-run]
 *   (ACHM_DATA_PATH must point at the campaign data dir)
 */

import { getDataPath } from '@achm/data';
import { PlotlineBeatSchema, PlotlineSchema } from '@achm/schemas';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { parseDocument, parse as yamlParse, stringify as yamlStringify } from 'yaml';
import { z } from 'zod';

// Inline beat shape plus the two fields the standalone file adds.
const ExtractedBeatSchema = PlotlineBeatSchema.extend({
  slug: z.string(),
  plotline: z.string(),
});

interface InlineBeat {
  title: string;
  status?: string;
  trigger?: string;
  factions?: string[];
  npcs?: string[];
  clues?: unknown;
  notes?: string;
}

interface BeatPlan {
  slug: string;
  targetPath: string;
  fileContent: string;
  alreadyExists: boolean;
}

interface PlotlinePlan {
  sourcePath: string;
  plotlineSlug: string;
  newPlotlineContent: string;
  beats: BeatPlan[];
}

const PLOTLINES_DIR = path.join(getDataPath(), 'plotlines');

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['"`‘’“”]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitFrontmatter(content: string): { fmText: string; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error('No frontmatter delimiters found');
  return { fmText: match[1], body: match[2] ?? '' };
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function arrayIsSubsetInOrder<T>(sub: T[], full: T[]): boolean {
  let j = 0;
  for (const v of sub) {
    while (j < full.length && full[j] !== v) j++;
    if (j >= full.length) return false;
    j++;
  }
  return true;
}

async function readUtf8OrNull(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

async function buildPlanForPlotline(
  sourcePath: string,
  content: string,
): Promise<PlotlinePlan | null> {
  const { fmText, body } = splitFrontmatter(content);
  const doc = parseDocument(fmText);
  const data = doc.toJS() as Record<string, unknown>;

  const plotlineSlug = data.slug;
  if (typeof plotlineSlug !== 'string' || plotlineSlug.length === 0) {
    throw new Error(`${sourcePath}: missing or empty slug`);
  }

  const inlineBeats = data.beats as InlineBeat[] | undefined;
  if (!inlineBeats || inlineBeats.length === 0) return null;

  const beatsDir = path.join(PLOTLINES_DIR, plotlineSlug, 'beats');

  const usedSlugs = new Set<string>();
  const beats: BeatPlan[] = [];
  const orderedSlugs: string[] = [];

  for (const inline of inlineBeats) {
    if (typeof inline.title !== 'string' || !inline.title.trim()) {
      throw new Error(`${sourcePath}: beat has empty title`);
    }
    const base = slugify(inline.title);
    if (!base) {
      throw new Error(`${sourcePath}: beat title "${inline.title}" slugifies to empty string`);
    }

    let candidate = base;
    let counter = 2;
    while (usedSlugs.has(candidate)) {
      candidate = `${base}-${counter++}`;
    }
    usedSlugs.add(candidate);
    orderedSlugs.push(candidate);

    const targetPath = path.join(beatsDir, `${candidate}.md`);
    const existing = await readUtf8OrNull(targetPath);

    if (existing !== null) {
      const existingFm = yamlParse(splitFrontmatter(existing).fmText) as
        | Record<string, unknown>
        | null;
      const existingTitle = existingFm?.title;
      if (existingTitle !== inline.title) {
        throw new Error(
          `${targetPath} already exists with title ${JSON.stringify(existingTitle)}; ` +
            `inline beat has title ${JSON.stringify(inline.title)}. Reconcile manually.`,
        );
      }
      beats.push({ slug: candidate, targetPath, fileContent: existing, alreadyExists: true });
      continue;
    }

    const beatFm: Record<string, unknown> = { slug: candidate };
    if (inline.title !== undefined) beatFm.title = inline.title;
    if (inline.status !== undefined) beatFm.status = inline.status;
    if (inline.trigger !== undefined) beatFm.trigger = inline.trigger;
    if (inline.factions !== undefined) beatFm.factions = inline.factions;
    if (inline.npcs !== undefined) beatFm.npcs = inline.npcs;
    if (inline.clues !== undefined) beatFm.clues = inline.clues;
    if (inline.notes !== undefined) beatFm.notes = inline.notes;
    beatFm.plotline = plotlineSlug;

    const fmYaml = yamlStringify(beatFm, { lineWidth: 0 }).trimEnd();
    const fileContent = `---\n${fmYaml}\n---\n`;
    beats.push({ slug: candidate, targetPath, fileContent, alreadyExists: false });
  }

  const existingRefs = data.beatRefs;
  if (existingRefs !== undefined) {
    if (!Array.isArray(existingRefs) || !existingRefs.every((v) => typeof v === 'string')) {
      throw new Error(`${sourcePath}: existing beatRefs is not a string[]`);
    }
    if (
      !arraysEqual(existingRefs as string[], orderedSlugs) &&
      !arrayIsSubsetInOrder(existingRefs as string[], orderedSlugs)
    ) {
      throw new Error(
        `${sourcePath}: existing beatRefs ${JSON.stringify(existingRefs)} ` +
          `does not match (or is not an ordered subset of) the generated list ` +
          `${JSON.stringify(orderedSlugs)}. Reconcile manually.`,
      );
    }
  }

  doc.delete('beats');
  doc.set('beatRefs', orderedSlugs);

  const newFmText = doc.toString().replace(/\n+$/, '');
  const newPlotlineContent = `---\n${newFmText}\n---\n${body}`;

  return { sourcePath, plotlineSlug, newPlotlineContent, beats };
}

function validatePlan(plans: PlotlinePlan[]): void {
  const errors: string[] = [];

  const allTargets = new Set<string>();
  for (const plan of plans) {
    for (const beat of plan.beats) {
      if (allTargets.has(beat.targetPath)) {
        errors.push(`duplicate target path: ${beat.targetPath}`);
      }
      allTargets.add(beat.targetPath);
    }
  }

  for (const plan of plans) {
    const { fmText } = splitFrontmatter(plan.newPlotlineContent);
    const fmObj = yamlParse(fmText) as Record<string, unknown>;
    const result = PlotlineSchema.safeParse(fmObj);
    if (!result.success) {
      errors.push(
        `plotline ${plan.sourcePath} fails PlotlineSchema:\n${result.error.message}`,
      );
    } else {
      const refs = (result.data.beatRefs ?? []) as string[];
      const planSlugs = plan.beats.map((b) => b.slug);
      if (!arraysEqual(refs, planSlugs)) {
        errors.push(
          `plotline ${plan.sourcePath}: beatRefs ${JSON.stringify(refs)} != generated ` +
            `${JSON.stringify(planSlugs)}`,
        );
      }
    }

    for (const beat of plan.beats) {
      if (beat.alreadyExists) continue;
      const { fmText: beatFmText } = splitFrontmatter(beat.fileContent);
      const beatFm = yamlParse(beatFmText) as Record<string, unknown>;
      const result = ExtractedBeatSchema.safeParse(beatFm);
      if (!result.success) {
        errors.push(
          `beat ${beat.targetPath} fails schema:\n${result.error.message}`,
        );
        continue;
      }
      if (result.data.plotline !== plan.plotlineSlug) {
        errors.push(
          `beat ${beat.targetPath}: plotline field ${JSON.stringify(
            result.data.plotline,
          )} != parent ${JSON.stringify(plan.plotlineSlug)}`,
        );
      }
      if (result.data.slug !== beat.slug) {
        errors.push(
          `beat ${beat.targetPath}: slug field ${JSON.stringify(result.data.slug)} != ` +
            `filename slug ${JSON.stringify(beat.slug)}`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed:\n  - ${errors.join('\n  - ')}`);
  }
}

async function writePlan(plans: PlotlinePlan[]): Promise<void> {
  for (const plan of plans) {
    const beatsDir = path.join(PLOTLINES_DIR, plan.plotlineSlug, 'beats');
    await fs.mkdir(beatsDir, { recursive: true });
    for (const beat of plan.beats) {
      if (beat.alreadyExists) continue;
      await fs.writeFile(beat.targetPath, beat.fileContent, 'utf-8');
    }
    await fs.writeFile(plan.sourcePath, plan.newPlotlineContent, 'utf-8');
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Data path: ${getDataPath()}`);
  console.log(dryRun ? '=== DRY RUN ===' : '=== WRITE MODE ===');

  const entries = await fs.readdir(PLOTLINES_DIR, { withFileTypes: true });
  const plotlineFiles = entries
    .filter((e) => e.isFile() && /\.(md|mdx)$/.test(e.name))
    .map((e) => path.join(PLOTLINES_DIR, e.name))
    .sort();

  const plans: PlotlinePlan[] = [];
  for (const filePath of plotlineFiles) {
    const content = await fs.readFile(filePath, 'utf-8');
    const plan = await buildPlanForPlotline(filePath, content);
    if (plan) plans.push(plan);
  }

  if (plans.length === 0) {
    console.log('No inline beats found. Nothing to do.');
    return;
  }

  for (const plan of plans) {
    console.log(`\nplotline: ${plan.plotlineSlug}`);
    for (const beat of plan.beats) {
      const tag = beat.alreadyExists ? 'skip (already migrated)' : 'create';
      console.log(`  ${tag}: ${path.relative(getDataPath(), beat.targetPath)}`);
    }
    console.log(`  rewrite: ${path.relative(getDataPath(), plan.sourcePath)}`);
  }

  validatePlan(plans);
  console.log('\nValidation passed.');

  if (dryRun) {
    console.log('Dry run — no files written.');
    return;
  }

  await writePlan(plans);
  console.log('Wrote all files.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
