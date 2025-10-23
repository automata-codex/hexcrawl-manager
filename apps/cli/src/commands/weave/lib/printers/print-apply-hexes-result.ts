import { ApplyHexesRow } from '../../commands/apply-hexes';

function mark(flipped?: boolean, already?: boolean) {
  return flipped ? '✓' : already ? '•' : '';
}

export function printApplyHexesSummary(
  rows: ApplyHexesRow[],
  totals: { dryRun: boolean; changed: number; scanned: number },
) {
  if (rows.length === 0) {
    console.log('Hexes: no relevant events in the selected sessions.');
    return;
  }
  const header = [
    'HEX',
    'scouted',
    'visited',
    'explored',
    '+landmark-known',
    'file',
  ];
  const lines = [header.join('  ')];

  for (const r of [...rows].sort((a, b) => a.hex.localeCompare(b.hex))) {
    lines.push(
      [
        r.hex,
        mark(r.flips.scouted, r.already.scouted),
        mark(r.flips.visited, r.already.visited),
        mark(r.flips.explored, r.already.explored),
        mark(r.flips.landmarkKnown, r.already.landmarkKnown),
        r.file,
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
