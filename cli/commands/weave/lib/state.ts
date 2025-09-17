import fs from 'fs';
import yaml from 'yaml';
import path from 'path';
import { getRepoPath } from '../../../../lib/repo';

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
  const id = footprint.id || (footprint.kind === 'session' ? `S-${Date.now().toString(36)}` : `ROLL-${Date.now().toString(36)}`);
  const filePath = path.join(footprintsDir, `${id}.yaml`);
  writeYamlAtomic(filePath, footprint);
}

export function writeYamlAtomic(filePath: string, data: any) {
  const yamlStr = yaml.stringify(data);
  const tmpPath = filePath + '.' + Math.random().toString(36).slice(2) + '.tmp';
  fs.writeFileSync(tmpPath, yamlStr, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

