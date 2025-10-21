import type { FinalizedHexEvent, HexIntents } from '../types';

export function collectHexIntents(events: FinalizedHexEvent[]): HexIntents {
  const intents: HexIntents = {};
  const ensure = (h: string) => (intents[h] ??= {});

  for (const e of events) {
    switch (e.kind) {
      case 'scout': {
        const h = e.payload.target.toLowerCase();
        ensure(h).scouted = true;
        if (e.payload.reveal?.landmark === true) {
          ensure(h).landmarkKnown = true;
        }
        break;
      }
      case 'explore': {
        const h = e.payload.target.toLowerCase();
        ensure(h).explored = true;
        break;
      }
      case 'move': {
        const dest = e.payload.to;
        if (dest) {
          ensure(dest.toLowerCase()).visited = true;
        }
        break;
      }
      // no default
    }
  }

  return intents;
}
