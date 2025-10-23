import { HexData } from '@skyreach/schemas';

import type { HexIntent } from '../types';

export type ApplyResult = {
  nextDoc: HexData;
  changed: boolean;
  flips: {
    scouted?: boolean; // flipped false/missing -> true
    visited?: boolean;
    explored?: boolean;
    landmarkKnown?: boolean; // tag was added this run
  };
};

const LANDMARK_TAG = 'landmark-known';

export function applyHexIntentToDoc(
  doc: HexData,
  intent: HexIntent,
): ApplyResult {
  let changed = false;
  const flips: ApplyResult['flips'] = {};
  const next: HexData = { ...doc };

  if (intent.scouted && next.isScouted !== true) {
    next.isScouted = true;
    changed = true;
    flips.scouted = true;
  }
  if (intent.visited && next.isVisited !== true) {
    next.isVisited = true;
    changed = true;
    flips.visited = true;
  }
  if (intent.explored && next.isExplored !== true) {
    next.isExplored = true;
    changed = true;
    flips.explored = true;
  }
  if (intent.landmarkKnown) {
    const tags = Array.isArray(next.tags) ? [...next.tags] : [];
    if (!tags.includes(LANDMARK_TAG)) {
      tags.push(LANDMARK_TAG);
      next.tags = tags;
      changed = true;
      flips.landmarkKnown = true;
    }
  }

  return { nextDoc: next, changed, flips };
}
