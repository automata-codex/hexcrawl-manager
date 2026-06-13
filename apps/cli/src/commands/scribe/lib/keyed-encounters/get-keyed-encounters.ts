import { loadHexData } from '../hex-data';

import type { KeyedEncounter } from '@achm/schemas';

/**
 * A hex's keyed encounters that trigger on `entry` — the ones a party
 * traveling *through* the hex sets off. `exploration`-triggered encounters are
 * found by searching the hex, which fast travel doesn't do, so they're left
 * out. Returns [] for unknown/unloadable hexes or hexes with none.
 *
 * Read-only: surfacing a keyed encounter never changes hex data — the GM runs
 * the encounter and updates the data repo as they see fit.
 */
export function getEntryKeyedEncounters(hexId: string): KeyedEncounter[] {
  const hex = loadHexData(hexId);
  if (!hex) {
    return [];
  }
  return (hex.keyedEncounters ?? []).filter((ke) => ke.trigger === 'entry');
}
