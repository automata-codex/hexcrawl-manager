import { info, warn, error } from '@skyreach/cli-kit';
import { parseSessionFilename, REPO_PATHS } from '@skyreach/data';
import { loadMeta } from '@skyreach/data';
import { makeSessionId } from '@skyreach/schemas';
import fs from 'node:fs';
import path from 'node:path';

import { readEvents } from '../../../services/event-log.service';
import { detectDevMode } from '../services/general';
import { listLockFiles, makeLockFileName, parseLockFileName } from '../services/lock-file';
import {
  checkSessionSequenceGaps,
  checkSessionDateConsistency,
} from '../services/session';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function doctor() {
  return (args: string[]) => {
    // Diagnostic collections
    const infos: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    let nextSessionSeq: number | undefined;
    let lockCounts = { active: 0, stale: 0, orphan: 0 };
    let orphanInProgress = 0;
    let missingStart = 0;
    let crossSeason = 0;
    let devFileCount = 0;
    let sessionGapCount = 0;
    let dateMismatchCount = 0;

    const devMode = detectDevMode(args);
    const inProgressDir = devMode
      ? REPO_PATHS.DEV_IN_PROGRESS()
      : REPO_PATHS.IN_PROGRESS();

    // 1. Meta (prod only)
    if (!devMode) {
      try {
        const meta = loadMeta();
        nextSessionSeq = meta.nextSessionSeq;
        infos.push(
          `Next session sequence: ${meta.nextSessionSeq ?? '(missing)'}`,
        );
      } catch (e) {
        errors.push(`Failed to read meta.yaml: ${e}`);
      }
    }

    // 2. Locks (prod only)
    let lockFiles: string[] = [];
    if (!devMode) {
      lockFiles = listLockFiles();
      lockCounts.active = lockFiles.length;
      if (lockFiles.length) {
        infos.push(`Found ${lockFiles.length} lock(s).`);
      } else {
        warnings.push('No lock files found.');
      }
    }

    // 3. In-progress files
    let inProgressFiles: string[] = [];
    if (fs.existsSync(inProgressDir)) {
      inProgressFiles = fs
        .readdirSync(inProgressDir)
        .filter((f) => f.endsWith('.jsonl'));
      infos.push(`Found ${inProgressFiles.length} in-progress file(s).`);
    } else {
      warnings.push(`${inProgressDir} not found.`);
    }

    // 4. Sessions
    let sessionFiles: string[] = [];
    if (fs.existsSync(REPO_PATHS.SESSIONS())) {
      sessionFiles = fs
        .readdirSync(REPO_PATHS.SESSIONS())
        .filter((f) => f.endsWith('.jsonl'));
      infos.push(`Found ${sessionFiles.length} finalized session file(s).`);
    } else {
      warnings.push('sessions/ directory not found.');
    }

    // 5. Dev files (always list for visibility)
    let devFiles: string[] = [];
    if (fs.existsSync(REPO_PATHS.DEV_IN_PROGRESS())) {
      devFiles = fs
        .readdirSync(REPO_PATHS.DEV_IN_PROGRESS())
        .filter((f) => f.endsWith('.jsonl'));
      devFileCount = devFiles.length;
      infos.push(`Found ${devFiles.length} dev file(s) in _dev/.`);
    } else {
      if (!devMode) warnings.push('_dev/ directory not found.');
    }

    // 6. Lock checks (prod)
    if (!devMode && lockFiles.length) {
      for (const lock of lockFiles) {
        const lockPath = path.join(REPO_PATHS.LOCKS(), lock);
        let mtime = 0;
        try {
          mtime = fs.statSync(lockPath).mtimeMs;
        } catch {
          /* no op */
        }
        const age = Date.now() - mtime;
        if (age > DAY_MS) {
          warnings.push(
            `Stale lock: ${lock} (age ${(age / DAY_MS).toFixed(1)} days)`,
          );
          lockCounts.stale++;
        }
        // Check for matching in-progress file
        const sessionId = parseLockFileName(lock);
        if (!sessionId) {
          warnings.push(`Could not parse session ID from lock file name: ${lock}`);
          continue;
        }
        if (!inProgressFiles.includes(sessionId)) {
          warnings.push(`Orphan lock: ${lock} (no matching in-progress file)`);
          lockCounts.orphan++;
        }
      }
    }

    // 7. In-progress checks
    for (const file of inProgressFiles) {
      // In prod, check for matching lock
      if (!devMode) {
        const sessionFileInfo = parseSessionFilename(file);
        if (!sessionFileInfo) {
          warnings.push(`Could not parse session filename: ${file}`);
          continue;
        }
        const sessionId = makeSessionId(sessionFileInfo.sessionNumber);
        const expectedLock = makeLockFileName(sessionId);
        if (!lockFiles.includes(expectedLock)) {
          warnings.push(`Orphan in-progress file: ${file} (no matching lock)`);
          const parsed = parseSessionFilename(file);
          if (parsed) {
            // Use helpers to build lock file content
            const seq = parsed.sessionNumber;
            const filename = file;
            const createdAt = new Date().toISOString();
            const pid = process.pid;
            const echoCmd = `echo '{"seq": ${seq}, "filename": "${filename}", "createdAt": "${createdAt}", "pid": ${pid}}' > data/session-logs/.locks/session-${seq}.lock`;
            infos.push(`To remediate, run: ${echoCmd}`);
          } else {
            warnings.push(
              `Could not parse session filename for remediation instructions: ${file}`,
            );
          }
          orphanInProgress++;
        }
      }
      // Check for session_start event
      const filePath = path.join(inProgressDir, file);
      let events: any[] = [];
      try {
        events = readEvents(filePath);
      } catch (e) {
        warnings.push(`Failed to read ${file}: ${e}`);
        continue;
      }
      if (!events.some((ev) => ev.kind === 'session_start')) {
        warnings.push(`In-progress file ${file} missing session_start event.`);
        missingStart++;
      }
    }

    // 8. Session log checks (cross-season)
    for (const file of sessionFiles) {
      const filePath = path.join(REPO_PATHS.SESSIONS(), file);
      let events: any[] = [];
      try {
        events = readEvents(filePath);
      } catch (e) {
        warnings.push(`Failed to read session file ${file}: ${e}`);
        continue;
      }
      // Find all unique seasonIds in day_start events
      const seasons = new Set(
        events
          .filter((ev) => ev.kind === 'day_start' && ev.seasonId)
          .map((ev) => (ev.seasonId || '').toLowerCase()),
      );
      if (seasons.size > 1) {
        warnings.push(
          `Session file ${file} spans multiple seasons: ${Array.from(seasons).join(', ')}`,
        );
        crossSeason++;
      }
    }

    // 9. Dev file summary
    // Already tracked as devFileCount

    // Sequence gap checks
    let metaSeq: number | undefined;
    if (!devMode) {
      try {
        const meta = loadMeta();
        metaSeq = meta.nextSessionSeq;
      } catch (e) {
        errors.push(`Failed to read meta.yaml: ${e}`);
      }
    }
    // Refactor helpers to return results
    const gapResults = checkSessionSequenceGaps({
      sessionFiles,
      inProgressFiles,
      lockFiles,
      metaSeq,
      collect: true,
    });
    if (gapResults) {
      sessionGapCount = gapResults.gaps.length;
      gapResults.warnings.forEach((w) => warnings.push(w));
      gapResults.infos.forEach((i) => infos.push(i));
    }

    // Session date consistency checks
    const dateResultsSessions = checkSessionDateConsistency({
      files: sessionFiles,
      dirName: 'SESSIONS',
      collect: true,
    });
    const dateResultsInProgress = checkSessionDateConsistency({
      files: inProgressFiles,
      dirName: devMode ? 'DEV_IN_PROGRESS' : 'IN_PROGRESS',
      collect: true,
    });
    if (dateResultsSessions) {
      dateMismatchCount += dateResultsSessions.mismatches.length;
      dateResultsSessions.warnings.forEach((w) => warnings.push(w));
    }
    if (dateResultsInProgress) {
      dateMismatchCount += dateResultsInProgress.mismatches.length;
      dateResultsInProgress.warnings.forEach((w) => warnings.push(w));
    }

    // Print structured summary
    info('--- Doctor Diagnostics Summary ---');
    info(`Next session sequence: ${nextSessionSeq ?? '(missing)'}`);
    info(
      `Lock files: active=${lockCounts.active}, stale=${lockCounts.stale}, orphan=${lockCounts.orphan}`,
    );
    info(`Orphan in-progress files: ${orphanInProgress}`);
    info(`In-progress files missing session_start: ${missingStart}`);
    info(`Sequence gaps: ${sessionGapCount}`);
    info(`Session date mismatches: ${dateMismatchCount}`);
    info(`Cross-season sessions: ${crossSeason}`);
    info(`Dev files present: ${devFileCount}`);
    if (infos.length) info('Info messages:');
    infos.forEach((i) => info(i));
    if (warnings.length) info('Warnings:');
    warnings.forEach((w) => warn(w));
    if (errors.length) info('Errors:');
    errors.forEach((e) => error(e));
    info('Doctor diagnostics complete.');
  };
}
