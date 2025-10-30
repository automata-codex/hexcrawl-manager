import path from 'path';

import { ApplyHexesRow } from '../../commands/apply-hexes';

function mark(flipped?: boolean, already?: boolean) {
  return flipped ? '✓' : already ? '•' : '';
}

function shortenPath(fullPath: string): string {
  // Extract region and filename from path like:
  // /Users/.../data/hexes/region-9/r14.yaml -> region-9/r14.yaml
  const parts = fullPath.split(path.sep);
  const fileIdx = parts.length - 1;
  const regionIdx = parts.length - 2;
  if (regionIdx >= 0 && parts[regionIdx].startsWith('region-')) {
    return `${parts[regionIdx]}/${parts[fileIdx]}`;
  }
  return path.basename(fullPath);
}

export function printApplyHexesSummary(
  rows: ApplyHexesRow[],
  totals: { dryRun: boolean; changed: number; scanned: number },
) {
  if (rows.length === 0) {
    console.log('Hexes: no relevant events in the selected sessions.');
    return;
  }

  const sortedRows = [...rows].sort((a, b) => a.hex.localeCompare(b.hex));

  // Prepare data with shortened paths
  const data = sortedRows.map((r) => ({
    hex: r.hex,
    visited: mark(r.flips.visited, r.already.visited),
    explored: mark(r.flips.explored, r.already.explored),
    scouted: mark(r.flips.scouted, r.already.scouted),
    landmark: mark(r.flips.landmarkKnown, r.already.landmarkKnown),
    file: shortenPath(r.file),
  }));

  // Calculate column widths
  const widths = {
    hex: Math.max(3, ...data.map((d) => d.hex.length)),
    visited: 7, // 'visited'.length
    explored: 8, // 'explored'.length
    scouted: 7, // 'scouted'.length
    landmark: 15, // '+landmark-known'.length
    file: 4, // 'file'.length (no padding needed for last column)
  };

  // Build header
  const header = [
    'HEX'.padEnd(widths.hex),
    'visited'.padEnd(widths.visited),
    'explored'.padEnd(widths.explored),
    'scouted'.padEnd(widths.scouted),
    '+landmark-known'.padEnd(widths.landmark),
    'file',
  ].join('  ');

  // Build rows
  const lines = [header];
  for (const d of data) {
    lines.push(
      [
        d.hex.padEnd(widths.hex),
        d.visited.padEnd(widths.visited),
        d.explored.padEnd(widths.explored),
        d.scouted.padEnd(widths.scouted),
        d.landmark.padEnd(widths.landmark),
        d.file,
      ].join('  '),
    );
  }

  console.log(lines.join('\n'));
  console.log(
    `\nHexes ${totals.dryRun ? 'planned' : 'applied'}: ${totals.changed} file${totals.changed === 1 ? '' : 's'} changed; ${totals.scanned} hex${totals.scanned === 1 ? '' : 'es'} scanned.`,
  );
}

export function printApplyHexesDiffs(rows: ApplyHexesRow[]) {
  for (const r of rows) {
    if (!r.changed || !r.beforeText || !r.afterText) continue;
    console.log(`\n--- ${r.file}`);
    console.log(r.afterText); // swap with your house unified diff printer when available
  }
}
