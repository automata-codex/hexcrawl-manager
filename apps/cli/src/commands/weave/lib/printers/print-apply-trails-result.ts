import { error, info } from '@skyreach/cli-kit';

import { ApplyTrailsResult } from '../types';

function printDryRunMarker(res: ApplyTrailsResult) {
  if (res.dryRun) {
    info('>>- DRY RUN -<<');
  }
}

export function printApplyTrailsResult(res: ApplyTrailsResult) {
  switch (res.status) {
    case 'ok': {
      if (res.kind === 'session') {
        const s = res.summary ?? {};
        printDryRunMarker(res);
        info(
          `Session applied: ${res.fileId} (season ${res.seasonId}). ` +
          `created=${s.created ?? 0}, rediscovered=${s.rediscovered ?? 0}, uses=${s.usesFlagged ?? 0}, touched=${s.edgesTouched ?? 0}.`,
        );
        printDryRunMarker(res);
      } else {
        const s = res.summary ?? {};
        printDryRunMarker(res);
        info(
          `Rollover applied: season ${res.seasonId}. ` +
          `maintained=${s.maintained ?? 0}, persisted=${s.persisted ?? 0}, deleted=${s.deletedTrails ?? 0}, touched=${s.edgesTouched ?? 0}.`,
        );
        printDryRunMarker(res);
      }
      break;
    }

    case 'already-applied':
      printDryRunMarker(res);
      info(res.message ?? 'Already applied.');
      printDryRunMarker(res);
      break;

    case 'no-op':
      printDryRunMarker(res);
      info(res.message ?? 'No changes would be made.');
      printDryRunMarker(res);
      break;

    case 'validation-error':
    case 'unrecognized-file':
      printDryRunMarker(res);
      error(res.message ?? 'Validation error.');
      printDryRunMarker(res);
      break;

    case 'io-error':
      printDryRunMarker(res);
      error(res.message ?? 'I/O error during apply.');
      printDryRunMarker(res);
      break;
  }
}
