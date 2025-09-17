import fs from 'fs';
import yaml from 'yaml';
import path from 'path';
import { getRepoPath } from '../../../../lib/repo';

export function appendToMetaAppliedSessions(meta: any, fileId: string) {
  if (!meta.appliedSessions) {
    meta.appliedSessions = [];
  }
  if (!meta.appliedSessions.includes(fileId)) {
    meta.appliedSessions.push(fileId);
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

export function writeFootprint(footprint: any) {
  const footprintsDir = getRepoPath('data', 'session-logs', 'footprints');
  if (!fs.existsSync(footprintsDir)) fs.mkdirSync(footprintsDir, { recursive: true });

  let fileName: string;
  if (footprint.kind === 'session') {
    // Extract sequence, suffix, and real-world date from sessionId
    // sessionId format: session_<SEQ><suffix>_<DATE>
    let realWorldDate = '';
    let sequence = 'unknown';
    let suffix = '';
    if (typeof footprint.id === 'string') {
      const match = footprint.id.match(/^session_(\d+)([a-z]*)_(\d{4}-\d{2}-\d{2})$/);
      if (match) {
        sequence = match[1];
        suffix = match[2] || '';
        realWorldDate = match[3] || new Date().toISOString().slice(0, 10);
      } else {
        // fallback: use the whole id
        sequence = footprint.id;
      }
    }
    fileName = `S-${realWorldDate}-${sequence}${suffix}.yaml`;
  } else if (footprint.kind === 'rollover') {
    // Use seasonId
    const seasonId = (footprint.seasonId || 'unknown').toString().toLowerCase();
    fileName = `ROLL-${seasonId}.yaml`;
  } else {
    // fallback
    fileName = `footprint-${Date.now().toString(36)}.yaml`;
  }

  const filePath = path.join(footprintsDir, fileName);
  writeYamlAtomic(filePath, footprint);
}

export function writeYamlAtomic(filePath: string, data: any) {
  const yamlStr = yaml.stringify(data);
  const tmpPath = filePath + '.' + Math.random().toString(36).slice(2) + '.tmp';
  fs.writeFileSync(tmpPath, yamlStr, 'utf8');
  fs.renameSync(tmpPath, filePath);
}
