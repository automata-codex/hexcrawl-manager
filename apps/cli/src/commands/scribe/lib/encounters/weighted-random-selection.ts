import { rollDice } from '@achm/core';

/**
 * Perform weighted random selection from a list of entries.
 * Assumes weights sum to a die size (typically 20 for d20).
 */
export function weightedRandomSelection<T>(
  entries: T[],
  getWeight: (entry: T) => number,
): T {
  const totalWeight = entries.reduce((sum, e) => sum + getWeight(e), 0);
  const roll = rollDice(`1d${totalWeight}`);

  let cumulative = 0;
  for (const entry of entries) {
    cumulative += getWeight(entry);
    if (roll <= cumulative) {
      return entry;
    }
  }

  // Fallback (should never reach here if weights are correct)
  return entries[entries.length - 1];
}
