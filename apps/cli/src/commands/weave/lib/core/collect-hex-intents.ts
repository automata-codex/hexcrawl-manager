import { normalizeHexId } from '@skyreach/core';

import type { FinalizedHexEvent, HexIntents } from '../types';

export function collectHexIntents(events: FinalizedHexEvent[]): HexIntents {
  const intents: HexIntents = {};
  const ensure = (h: string) => {
    const hexId = normalizeHexId(h);
    return intents[hexId] ??= {};
  }

  for (const e of events) {
    switch (e.kind) {
      case 'scout': {
        ensure(e.payload.target).scouted = true;
        if (e.payload.reveal?.landmark === true) {
          ensure(e.payload.target).landmarkKnown = true;
        }
        break;
      }
      case 'explore': {
        ensure(e.payload.target).explored = true;
        break;
      }
      case 'move': {
        ensure(e.payload.to).visited = true;
        break;
      }
      // no default
    }
  }

  return intents;
}
