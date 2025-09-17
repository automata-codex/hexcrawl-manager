import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import { getRepoPath } from '../../../../lib/repo';
import { info, error } from '../../scribe/lib/report';
import yaml from 'yaml';

const SESSION_LOGS_DIR = getRepoPath('data', 'session-logs');
const SESSIONS_DIR = path.join(SESSION_LOGS_DIR, 'sessions');
const ROLLOVERS_DIR = path.join(SESSION_LOGS_DIR, 'rollovers');

export function listCandidateFiles(meta: any): string[] {
  const sessionFiles = listFilesIfDir(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'));
  const rolloverFiles = listFilesIfDir(ROLLOVERS_DIR).filter(f => f.endsWith('.jsonl'));
  const allCandidates = [...sessionFiles, ...rolloverFiles].filter(f => {
    const id = path.basename(f);
    return !meta.appliedSessions?.includes(id);
  });
  // Sort by filename (chronological order assumed)
  allCandidates.sort((a, b) => a.localeCompare(b));
  return allCandidates;
}

function listFilesIfDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir).map(f => path.join(dir, f));
  } catch {
    return [];
  }
}

export function loadMeta() {
  const META_PATH = getRepoPath('data', 'meta.yaml');
  try {
    return yaml.parse(fs.readFileSync(META_PATH, 'utf8')) as any;
  } catch {
    return { appliedSessions: [], rolledSeasons: [] };
  }
}

export async function promptSelectFile(candidates: string[]): Promise<string> {
  const choices = candidates.map(f => ({
    title: path.relative(process.cwd(), f),
    value: f
  }));
  const response = await prompts({
    type: 'select',
    name: 'file',
    message: 'Select a session or rollover file:',
    choices
  });
  return response.file;
}

export async function resolveInputFile(fileArg: string | undefined, meta: any, opts?: { noPrompt?: boolean }): Promise<string> {
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

