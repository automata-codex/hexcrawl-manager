import { info, selectFromFiles } from '@achm/cli-kit';
import { REPO_PATHS } from '@achm/data';
import { MetaV2Data } from '@achm/schemas';
import fs from 'fs';
import path from 'path';

export type ResolveInputFileStatus =
  | 'ok'
  | 'none-found' // no candidates in repo
  | 'no-prompt-no-arg' // --no-prompt set and no fileArg
  | 'cancelled'; // user escaped the prompt

export interface ResolveInputFileResult {
  status: ResolveInputFileStatus;
  file?: string;
  candidates?: string[]; // helpful for logging/debug
}

function listCandidateFiles(meta: MetaV2Data): string[] {
  const sessionFiles = listFilesIfDir(REPO_PATHS.SESSIONS()).filter((f) =>
    f.endsWith('.jsonl'),
  );
  const rolloverFiles = listFilesIfDir(REPO_PATHS.ROLLOVERS()).filter((f) =>
    f.endsWith('.jsonl'),
  );
  const allCandidates = [...sessionFiles, ...rolloverFiles].filter((f) => {
    const id = path.basename(f);
    return !meta.state.trails.applied?.sessions?.includes(id);
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

/**
 * Resolve the input file to apply (session or rollover).
 * Never calls process.exit; caller decides what to do with the result.
 */
export async function resolveInputFile(
  fileArg: string | undefined,
  meta: MetaV2Data,
): Promise<ResolveInputFileResult> {
  if (fileArg) {
    return { status: 'ok', file: fileArg };
  }

  const candidates = listCandidateFiles(meta);
  if (candidates.length === 0) {
    info('No unapplied session or rollover files found.');
    return { status: 'none-found', candidates };
  }

  const choices = candidates.map((f) => ({
    label: path.basename(f, 'jsonl'),
    value: f,
  }));

  const selected = await selectFromFiles(choices);

  if (!selected) {
    info('No file selected.');
    return { status: 'cancelled', candidates };
  }

  info(`Selected file: ${selected}`);
  return { status: 'ok', file: selected };
}
