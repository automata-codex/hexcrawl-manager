import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { getRepoPath } from '../../../../lib/repo';

// TODO: Use Enquirer for prompts when candidates exist

const META_PATH = getRepoPath('data', 'meta.yaml');
const SESSION_LOGS_DIR = getRepoPath('data', 'session-logs');
const SESSIONS_DIR = path.join(SESSION_LOGS_DIR, 'sessions');
const ROLLOVERS_DIR = path.join(SESSION_LOGS_DIR, 'rollovers');

function listFilesIfDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir).map(f => path.join(dir, f));
  } catch {
    return [];
  }
}

function loadMeta() {
  try {
    return yaml.parse(fs.readFileSync(META_PATH, 'utf8')) as any;
  } catch {
    return { appliedSessions: [], rolledSeasons: [] };
  }
}

function isSessionFile(filePath: string): boolean {
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath);
  return dir === 'sessions' && /^session_\d+_\d{4}-\d{2}-\d{2}.*\.jsonl$/i.test(base);
}

function isRolloverFile(filePath: string): boolean {
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath);
  return dir === 'rollovers' && /^rollover_[\w-]+_\d{4}-\d{2}-\d{2}.*\.jsonl$/i.test(base);
}

export async function plan(fileArg?: string) {
  const meta = loadMeta();
  let file = fileArg;

  if (!file) {
    // List candidate session and rollover files
    const sessionFiles = listFilesIfDir(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'));
    const rolloverFiles = listFilesIfDir(ROLLOVERS_DIR).filter(f => f.endsWith('.jsonl'));
    const allCandidates = [...sessionFiles, ...rolloverFiles].filter(f => {
      const id = path.basename(f);
      return !meta.appliedSessions?.includes(id);
    });
    if (allCandidates.length === 0) {
      console.log('No unapplied session or rollover files found.');
      process.exit(5);
    }
    // TODO: Prompt user to select a file (Enquirer)
    file = allCandidates[0]; // For now, just pick the first
    console.log(`Planning for: ${file}`);
  }

  // File type detection
  if (isRolloverFile(file)) {
    console.log('Rollover planning not yet implemented.');
    process.exit(0);
  } else if (isSessionFile(file)) {
    console.log('Session planning not yet implemented.');
    process.exit(0);
  } else {
    console.error('Unrecognized file type for planning.');
    process.exit(4);
  }
}
