import { normalizeHexId } from '@achm/core';
import {
  HexFileNotFoundError,
  loadMapConfig,
  REPO_PATHS,
  writeYamlAtomic,
} from '@achm/data';
import { HexData } from '@achm/schemas';
import fs from 'node:fs';
import yaml from 'yaml';

import { applyHexIntentToDoc } from '../lib/core/apply-hex-intent';
import { collectHexIntents } from '../lib/core/collect-hex-intents';
import { buildHexFileIndex } from '../lib/files';
import { printApplyHexesDiffs } from '../lib/printers';
import { FinalizedHexEvent, HexIntents } from '../lib/types';

export type ApplyHexesRow = {
  hex: string; // normalized (recommend UPPER)
  file: string; // lowercase path on disk
  flips: {
    scouted?: boolean;
    visited?: boolean;
    explored?: boolean;
    landmarkKnown?: boolean;
  };
  already: {
    scouted?: boolean;
    visited?: boolean;
    explored?: boolean;
    landmarkKnown?: boolean;
  };
  changed: boolean; // convenience flag
  // optional diffs for dry-run UI
  beforeText?: string;
  afterText?: string;
};

export type ApplyHexesOptions = {
  dryRun: boolean;
  events: FinalizedHexEvent[];
  hexesRoot?: string; // default REPO_PATHS.HEXES()
  captureDiffs?: boolean; // default false; only meaningful in dry-run
};

export async function applyHexes(
  opts: ApplyHexesOptions,
): Promise<{ changed: number; scanned: number; rows: ApplyHexesRow[] }> {
  const root = opts.hexesRoot ?? REPO_PATHS.HEXES();

  // 1) index once (index keys should be NORMALIZED, values are lowercase paths)
  const index = buildHexFileIndex(root);

  // 2) collect intents (ensure collector normalizes IDs consistently)
  const notation = loadMapConfig().grid.notation;
  const intents: HexIntents = collectHexIntents(opts.events, notation);

  const rows: ApplyHexesRow[] = [];
  let changed = 0;
  let scanned = 0;

  // 3) apply per hex
  for (const [hexKey, intent] of Object.entries(intents)) {
    const norm = normalizeHexId(hexKey, notation); // e.g., "Q12"
    const file = index[norm];
    if (!file) {
      // include normalized id in error for clarity
      throw new HexFileNotFoundError(`${hexKey} (${norm})`);
    }

    const beforeText = fs.readFileSync(file, 'utf8');
    const beforeDoc = yaml.parse(beforeText) as HexData;

    const already = {
      scouted: beforeDoc.isScouted === true,
      visited: beforeDoc.isVisited === true,
      explored: beforeDoc.isExplored === true,
      landmarkKnown:
        Array.isArray(beforeDoc.tags) &&
        beforeDoc.tags.includes('landmark-known'),
    };

    const {
      nextDoc,
      changed: fileChanged,
      flips,
    } = applyHexIntentToDoc(beforeDoc, intent);
    const row: ApplyHexesRow = {
      hex: norm,
      file,
      flips,
      already,
      changed: fileChanged,
    };

    scanned += 1;

    if (fileChanged) {
      changed += 1;

      if (opts.dryRun) {
        if (opts.captureDiffs) {
          row.beforeText = beforeText;
          row.afterText = yaml.stringify(nextDoc);
        }
        printApplyHexesDiffs([row]);
      } else {
        writeYamlAtomic(file, nextDoc);
      }
    }

    rows.push(row);
  }

  return { changed, scanned, rows };
}
