import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import yaml from 'yaml';
import { hexSort, normalizeHexId } from '../../../../lib/hexes';
import { getRepoPath } from '../../../../lib/repo';
import { info, error } from '../../scribe/lib/report';
import { normalizeSeasonId } from './season.ts';

const SESSION_LOGS_DIR = getRepoPath('data', 'session-logs');
const SESSIONS_DIR = path.join(SESSION_LOGS_DIR, 'sessions');
const ROLLOVERS_DIR = path.join(SESSION_LOGS_DIR, 'rollovers');

export function appendToMetaAppliedSessions(meta: any, fileId: string) {
  if (!meta.appliedSessions) meta.appliedSessions = [];
  if (!meta.appliedSessions.includes(fileId)) meta.appliedSessions.push(fileId);
}

export function canonicalEdgeKey(a: string, b: string): string {
  const [h1, h2] = [normalizeHexId(a), normalizeHexId(b)].sort(hexSort);
  return `${h1.toLowerCase()}-${h2.toLowerCase()}`;
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

export function isGitDirty(): boolean {
  try {
    const output = execSync('git status --porcelain', { encoding: 'utf8' });
    return output.trim().length > 0;
  } catch (e) {
    // If git is not available, treat as dirty to be safe
    return true;
  }
}

export function isRolloverAlreadyApplied(meta: any, fileId: string): boolean {
  return meta.appliedSessions?.includes(fileId);
}

export function isRolloverChronologyValid(meta: any, seasonId: string): { valid: boolean, expected: string } {
  // Only allow rollover for the next unapplied season
  const expected = getNextUnrolledSeason(meta);
  const valid = expected && normalizeSeasonId(seasonId) === normalizeSeasonId(expected);
  return { valid: !!valid, expected: expected || '' };
}

export function isRolloverFile(filePath: string): boolean {
  const path = require('path');
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath);
  return dir === 'rollovers' && /^rollover_[\w-]+_\d{4}-\d{2}-\d{2}.*\.jsonl$/i.test(base);
}

export function isSessionAlreadyApplied(meta: any, fileId: string): boolean {
  return meta.appliedSessions?.includes(fileId);
}

export function isSessionChronologyValid(meta: any, seasonId: string): { valid: boolean, missing: string[] } {
  // All seasons up to and including this one must be in meta.rolledSeasons
  // For now, just check that this seasonId is in meta.rolledSeasons
  const normalized = normalizeSeasonId(seasonId);
  const rolled = (meta.rolledSeasons || []).map(normalizeSeasonId);
  const valid = rolled.includes(normalized);
  return { valid, missing: valid ? [] : [seasonId] };
}

export function isSessionFile(filePath: string): boolean {
  const path = require('path');
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath);
  return dir === 'sessions' && /^session_\d+_\d{4}-\d{2}-\d{2}.*\.jsonl$/i.test(base);
}

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

export function loadHavens(): string[] {
  const havensPath = getRepoPath('data', 'havens.yml');
  try {
    return yaml.parse(fs.readFileSync(havensPath, 'utf8')) as string[];
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

export function loadTrails(): Record<string, any> {
  const trailsPath = getRepoPath('data', 'trails.yml');
  try {
    return yaml.parse(fs.readFileSync(trailsPath, 'utf8')) as Record<string, any>;
  } catch {
    return {};
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

export function requireCleanGitOrAllowDirty(opts?: { allowDirty?: boolean }) {
  const allowDirty = opts?.allowDirty || process.argv.includes('--allow-dirty');
  if (!allowDirty && isGitDirty()) {
    error('Refusing to proceed: working tree is dirty (commit or stash changes, or use --allow-dirty).');
    process.exit(2);
  }
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

export function writeYamlAtomic(filePath: string, data: any) {
  const yamlStr = yaml.stringify(data);
  const tmpPath = filePath + '.' + Math.random().toString(36).slice(2) + '.tmp';
  fs.writeFileSync(tmpPath, yamlStr, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

export function writeFootprint(footprint: any) {
  const footprintsDir = getRepoPath('data', 'session-logs', 'footprints');
  if (!fs.existsSync(footprintsDir)) fs.mkdirSync(footprintsDir, { recursive: true });
  const id = footprint.id || (footprint.kind === 'session' ? `S-${Date.now().toString(36)}` : `ROLL-${Date.now().toString(36)}`);
  const filePath = path.join(footprintsDir, `${id}.yaml`);
  writeYamlAtomic(filePath, footprint);
}
