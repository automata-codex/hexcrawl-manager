import { getGitHeadCommit, REPO_PATHS, writeYamlAtomic } from '@skyreach/data';
import path from 'path';

export function writeFootprint(footprint: any, domain: string = 'trails') {
  let fileName: string;
  if (footprint.kind === 'session') {
    // Extract sequence, suffix, and real-world date from sessionId
    // sessionId format: session-<SEQ><suffix>_<DATE>
    let realWorldDate = '';
    let sequence = 'unknown';
    let suffix = '';
    if (typeof footprint.id === 'string') {
      const match = footprint.id.match(
        /^session[_-](\d+)([a-z]*)_(\d{4}-\d{2}-\d{2})$/, // TODO Replace with SCRIBE_ID_RE when available
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
    fileName = `S-${sequence}${suffix}_${realWorldDate}.yaml`;
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

  const filePath = path.join(REPO_PATHS.FOOTPRINTS(domain), fileName);
  writeYamlAtomic(filePath, footprint);
}
