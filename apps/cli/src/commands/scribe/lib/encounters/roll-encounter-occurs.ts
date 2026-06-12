import { rollDice } from '@achm/core';

/**
 * Roll a d20 to determine if an encounter occurs.
 * @param threshold d20 threshold: an encounter occurs on a roll <= threshold
 *   (0 = never, 20 = always)
 * @returns true if an encounter occurs
 */
export function rollEncounterOccurs(threshold: number): boolean {
  if (threshold <= 0) {
    return false;
  }
  return rollDice('1d20') <= threshold;
}
