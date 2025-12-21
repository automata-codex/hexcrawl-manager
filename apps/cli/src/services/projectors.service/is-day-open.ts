import type { ScribeEvent } from '@achm/schemas';

export function isDayOpen(events: ScribeEvent[]) {
  let lastStartIdx = -1;
  let lastEndIdx = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    const k = events[i].kind;
    if (k === 'day_end' && lastEndIdx === -1) {
      lastEndIdx = i;
    }
    if (k === 'day_start' && lastStartIdx === -1) {
      lastStartIdx = i;
    }
    if (lastStartIdx !== -1 && lastEndIdx !== -1) {
      break;
    }
  }
  return (
    lastStartIdx !== -1 && (lastEndIdx === -1 || lastStartIdx > lastEndIdx)
  );
}
