import { info, warn, error } from '../lib/report.ts';
import { detectDevMode } from '../lib/env.ts';
import { readJsonl } from '../lib/jsonl.ts';
import { getRepoPath } from '../../../../lib/repo';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function doctor(ctx: any) {
  return (args: string[]) => {
    const devMode = detectDevMode(args);
    const logsRoot = getRepoPath('data', 'session-logs');
    const metaPath = getRepoPath('data', 'meta.yaml');
    const inProgressDir = devMode
      ? path.join(logsRoot, '_dev')
      : path.join(logsRoot, 'in-progress');
    const locksDir = path.join(logsRoot, '.locks');
    const sessionsDir = path.join(logsRoot, 'sessions');
    const devDir = path.join(logsRoot, '_dev');

    // 1. Meta (prod only)
    if (!devMode) {
      if (fs.existsSync(metaPath)) {
        try {
          const metaRaw = fs.readFileSync(metaPath, 'utf8');
          const meta = yaml.parse(metaRaw) || {};
          info(`Next session sequence: ${meta.nextSessionSeq ?? '(missing)'}`);
        } catch (e) {
          error(`Failed to read meta.yaml: ${e}`);
        }
      } else {
        warn('meta.yaml not found.');
      }
    }

    // 2. Locks (prod only)
    let lockFiles: string[] = [];
    if (!devMode) {
      if (fs.existsSync(locksDir)) {
        lockFiles = fs.readdirSync(locksDir).filter(f => f.endsWith('.lock'));
        info(`Found ${lockFiles.length} lock(s).`);
      } else {
        warn('No .locks/ directory found.');
      }
    }

    // 3. In-progress files
    let inProgressFiles: string[] = [];
    if (fs.existsSync(inProgressDir)) {
      inProgressFiles = fs.readdirSync(inProgressDir).filter(f => f.endsWith('.jsonl'));
      info(`Found ${inProgressFiles.length} in-progress file(s).`);
    } else {
      warn(`${inProgressDir} not found.`);
    }

    // 4. Sessions
    let sessionFiles: string[] = [];
    if (fs.existsSync(sessionsDir)) {
      sessionFiles = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
      info(`Found ${sessionFiles.length} finalized session file(s).`);
    } else {
      warn('sessions/ directory not found.');
    }

    // 5. Dev files (always list for visibility)
    let devFiles: string[] = [];
    if (fs.existsSync(devDir)) {
      devFiles = fs.readdirSync(devDir).filter(f => f.endsWith('.jsonl'));
      info(`Found ${devFiles.length} dev file(s) in _dev/.`);
    } else {
      if (!devMode) warn('_dev/ directory not found.');
    }

    // 6. Lock checks (prod)
    let staleLocks = 0, orphanLocks = 0;
    if (!devMode && lockFiles.length) {
      for (const lock of lockFiles) {
        const lockPath = path.join(locksDir, lock);
        let mtime = 0;
        try {
          mtime = fs.statSync(lockPath).mtimeMs;
        } catch {}
        const age = Date.now() - mtime;
        if (age > DAY_MS) {
          warn(`Stale lock: ${lock} (age ${(age / DAY_MS).toFixed(1)} days)`);
          staleLocks++;
        }
        // Check for matching in-progress file
        const sessionId = lock.replace(/^session_|\.lock$/g, '');
        const expected = `${sessionId}.jsonl`;
        if (!inProgressFiles.includes(expected)) {
          warn(`Orphan lock: ${lock} (no matching in-progress file)`);
          orphanLocks++;
        }
      }
      info(`Stale locks: ${staleLocks}, Orphan locks: ${orphanLocks}`);
    }

    // 7. In-progress checks
    let orphanInProgress = 0, missingStart = 0;
    for (const file of inProgressFiles) {
      // In prod, check for matching lock
      if (!devMode) {
        const sessionId = file.replace(/\.jsonl$/, '');
        const expectedLock = `session_${sessionId}.lock`;
        if (!lockFiles.includes(expectedLock)) {
          warn(`Orphan in-progress file: ${file} (no matching lock)`);
          orphanInProgress++;
        }
      }
      // Check for session_start event
      const filePath = path.join(inProgressDir, file);
      let events: any[] = [];
      try {
        events = readJsonl(filePath);
      } catch (e) {
        warn(`Failed to read ${file}: ${e}`);
        continue;
      }
      if (!events.some(ev => ev.kind === 'session_start')) {
        warn(`In-progress file ${file} missing session_start event.`);
        missingStart++;
      }
    }
    info(`Orphan in-progress: ${orphanInProgress}, Missing session_start: ${missingStart}`);

    // 8. Session log checks (cross-season)
    let crossSeason = 0;
    for (const file of sessionFiles) {
      const filePath = path.join(sessionsDir, file);
      let events: any[] = [];
      try {
        events = readJsonl(filePath);
      } catch (e) {
        warn(`Failed to read session file ${file}: ${e}`);
        continue;
      }
      // Find all unique seasonIds in day_start events
      const seasons = new Set(events.filter(ev => ev.kind === 'day_start' && ev.seasonId).map(ev => (ev.seasonId || '').toLowerCase()));
      if (seasons.size > 1) {
        warn(`Session file ${file} spans multiple seasons: ${Array.from(seasons).join(', ')}`);
        crossSeason++;
      }
    }
    info(`Cross-season sessions: ${crossSeason}`);

    // 9. Dev file summary
    if (!devMode) {
      info(`Dev files present: ${devFiles.length}`);
    }

    info('Doctor diagnostics complete.');
  };
}

