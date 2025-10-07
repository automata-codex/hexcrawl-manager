import { REPO_PATHS, getGitHeadCommit, writeYamlAtomic } from '@skyreach/data';
import { MetaData } from '@skyreach/schemas';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export function appendToMetaAppliedSessions(meta: MetaData, fileId: string) {
  if (!meta.appliedSessions) {
    meta.appliedSessions = [];
  }
  if (!meta.appliedSessions.includes(fileId)) {
    meta.appliedSessions.push(fileId);
  }
}

/** @deprecated Use version from `@skyreach/data` instead. */
export function loadHavens(): string[] {
  try {
    return yaml.parse(fs.readFileSync(REPO_PATHS.HAVENS(), 'utf8')) as string[];
  } catch {
    return [];
  }
}

/** @deprecated Use version from `@skyreach/data` instead. */
export function loadTrails(): Record<string, any> {
  try {
    return yaml.parse(fs.readFileSync(REPO_PATHS.TRAILS(), 'utf8')) as Record<
      string,
      any
    >;
  } catch {
    return {};
  }
}

export function writeFootprint(footprint: any) {
  let fileName: string;
  if (footprint.kind === 'session') {
    // Extract sequence, suffix, and real-world date from sessionId
    // sessionId format: session_<SEQ><suffix>_<DATE>
    let realWorldDate = '';
    let sequence = 'unknown';
    let suffix = '';
    if (typeof footprint.id === 'string') {
      const match = footprint.id.match(
        /^session_(\d+)([a-z]*)_(\d{4}-\d{2}-\d{2})$/,
      );
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

  // Add optional git field if available
  const gitHead = getGitHeadCommit();
  if (gitHead) {
    footprint.git = { headCommit: gitHead };
  }

  const filePath = path.join(REPO_PATHS.FOOTPRINTS(), fileName);
  writeYamlAtomic(filePath, footprint);
}
