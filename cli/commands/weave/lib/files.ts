import { info, error } from '@skyreach/cli-kit';
import { REPO_PATHS, isGitDirty } from '@skyreach/data';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import yaml from 'yaml';


import { compareSeasonIds, normalizeSeasonId } from './season.ts';

/**
 * Find the most recent rollover footprint for a given seasonId (<= that season).
 * Returns the parsed YAML data or null if not found.
 */
export function getMostRecentRolloverFootprint(seasonId: string): any | null {
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(REPO_PATHS.FOOTPRINTS())
      .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map((f) => path.join(REPO_PATHS.FOOTPRINTS(), f));
  } catch {
    return null;
  }
  let best: { seasonId: string; file: string; data: any } | null = null;
  for (const file of files) {
    const data = yaml.parse(fs.readFileSync(file, 'utf8'));
    if (data.kind === 'rollover' && data.seasonId) {
      if (
        !best ||
        (compareSeasonIds(data.seasonId, best.seasonId) > 0 &&
          compareSeasonIds(data.seasonId, seasonId) <= 0)
      ) {
        best = { seasonId: data.seasonId, file, data };
      }
    }
  }
  return best ? best.data : null;
}

export function getNextUnrolledSeason(meta: any): string | null {
  // meta.rolledSeasons is sorted chronologically; find the next season after the last rolled
  if (!meta.rolledSeasons || meta.rolledSeasons.length === 0) return null;
  const last = meta.rolledSeasons[meta.rolledSeasons.length - 1];
  // Next season: increment season (wrap to next year if autumn)
  const [yearStr, season] = normalizeSeasonId(last).split('-');
  const year = parseInt(yearStr, 10);
  const order = ['winter', 'spring', 'summer', 'autumn'];
  let idx = order.indexOf(season);
  if (idx === -1) return null;
  idx = (idx + 1) % 4;
  const nextYear = idx === 0 ? year + 1 : year;
  return `${nextYear}-${order[idx]}`;
}

export function listCandidateFiles(meta: any): string[] {
  const sessionFiles = listFilesIfDir(REPO_PATHS.SESSIONS()).filter((f) =>
    f.endsWith('.jsonl'),
  );
  const rolloverFiles = listFilesIfDir(REPO_PATHS.ROLLOVERS()).filter((f) =>
    f.endsWith('.jsonl'),
  );
  const allCandidates = [...sessionFiles, ...rolloverFiles].filter((f) => {
    const id = path.basename(f);
    return !meta.appliedSessions?.includes(id);
  });
  allCandidates.sort((a, b) => a.localeCompare(b));
  return allCandidates;
}

function listFilesIfDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir).map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

export async function promptSelectFile(candidates: string[]): Promise<string> {
  const choices = candidates.map((f) => ({
    title: path.relative(process.cwd(), f),
    value: f,
  }));
  const response = await prompts({
    type: 'select',
    name: 'file',
    message: 'Select a session or rollover file:',
    choices,
  });
  return response.file;
}

export function requireCleanGitOrAllowDirty(opts?: { allowDirty?: boolean }) {
  const allowDirty = opts?.allowDirty || process.argv.includes('--allow-dirty');
  if (!allowDirty && isGitDirty()) {
    error(
      'Refusing to proceed: working tree is dirty (commit or stash changes, or use --allow-dirty).',
    );
    process.exit(2);
  }
}

export async function resolveInputFile(
  fileArg: string | undefined,
  meta: any,
  opts?: { noPrompt?: boolean },
): Promise<string> {
  const noPrompt = opts?.noPrompt || process.argv.includes('--no-prompt');
  if (fileArg) return fileArg;
  const candidates = listCandidateFiles(meta);
  if (candidates.length === 0) {
    info('No unapplied session or rollover files found.');
    process.exit(5);
  }
  if (noPrompt) {
    error('No file specified and --no-prompt is set.');
    process.exit(4);
  }
  const selected = await promptSelectFile(candidates);
  if (!selected) {
    info('No file selected.');
    process.exit(5);
  }
  info(`Selected file: ${selected}`);
  return selected;
}
