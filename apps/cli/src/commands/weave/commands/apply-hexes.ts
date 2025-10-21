import { normalizeHexId } from '@skyreach/core';
import { HexFileNotFoundError, writeYamlAtomic } from '@skyreach/data';
import { HexData } from '@skyreach/schemas';
import fs from 'node:fs';
import yaml from 'yaml';

import { applyHexIntentToDoc } from '../lib/core/apply-hex-intent';
import { collectHexIntents } from '../lib/core/collect-hex-intents';
import { buildHexFileIndex } from '../lib/files';
import { FinalizedHexEvent, HexIntents } from '../lib/types';

type SummaryRow = {
  hex: string;
  file: string;
  flips: { scouted?: boolean; visited?: boolean; explored?: boolean; landmarkKnown?: boolean };
  already: { scouted?: boolean; visited?: boolean; explored?: boolean; landmarkKnown?: boolean };
};

export type ApplyHexesOptions = {
  dryRun: boolean;
  // Provide the events in-scope. When invoked via `weave apply`, pass only those sessions.
  events: FinalizedHexEvent[];
  hexesRoot?: string; // default 'data/hexes'
};

function mark(flipped?: boolean, already?: boolean) {
  return flipped ? '✓' : already ? '•' : '';
}

function printSummary(rows: SummaryRow[], { log = console.log } = {}) {
  if (rows.length === 0) {
    log('No hexes affected by the selected sessions.');
    return;
  }

  const header = ['HEX', 'scouted', 'visited', 'explored', '+landmark-known', 'file'];
  const lines = [header.join('  ')];

  for (const r of rows.sort((a, b) => a.hex.localeCompare(b.hex))) {
    lines.push(
      [
        r.hex,
        mark(r.flips.scouted, r.already.scouted),
        mark(r.flips.visited, r.already.visited),
        mark(r.flips.explored, r.already.explored),
        mark(r.flips.landmarkKnown, r.already.landmarkKnown),
        r.file,
      ].join('  ')
    );
  }

  log(lines.join('\n'));
}

export async function applyHexes(opts: ApplyHexesOptions): Promise<{ changed: number; scanned: number; rows: SummaryRow[] }> {
  const log = console.log;
  const root = opts.hexesRoot ?? 'data/hexes';

  // 1) index once
  const index = buildHexFileIndex(root);

  // 2) collect intents
  const intents: HexIntents = collectHexIntents(opts.events);

  const rows: SummaryRow[] = [];
  let changed = 0;
  let scanned = 0;

  // 3) apply per hex
  for (const [hex, intent] of Object.entries(intents)) {
    const file = index[normalizeHexId(hex)];
    if (!file) {
      throw new HexFileNotFoundError(hex);
    }

    const beforeText = fs.readFileSync(file, 'utf8');
    const beforeDoc = yaml.parse(beforeText) as HexData;

    const already = {
      scouted: beforeDoc.isScouted === true,
      visited: beforeDoc.isVisited === true,
      explored: beforeDoc.isExplored === true,
      landmarkKnown: Array.isArray(beforeDoc.tags) && beforeDoc.tags.includes('landmark-known'),
    };

    const { nextDoc, changed: fileChanged, flips } = applyHexIntentToDoc(beforeDoc, intent);

    scanned += 1;

    rows.push({ hex, file, flips, already });

    if (fileChanged) {
      changed += 1;

      if (opts.dryRun) {
        const afterText = yaml.stringify(nextDoc);
        // TODO Print output without changing files
      } else {
        writeYamlAtomic(file, nextDoc);
      }
    }
  }

  // 4) summary print (compact)
  printSummary(rows, { log });

  log(`\n${opts.dryRun ? 'Planned' : 'Applied'}: ${changed} file(s) changed; ${scanned} hex(es) scanned.`);

  return { changed, scanned, rows };
}
