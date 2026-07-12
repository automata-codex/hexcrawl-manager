import { rollDice } from '@achm/core';

/**
 * Result of an encounter check: the raw d20 result (null if no die was
 * rolled, i.e. threshold <= 0) and whether it triggered an encounter.
 */
export interface EncounterRollResult {
  roll: number | null;
  triggered: boolean;
}

/**
 * Roll a d20 to determine if an encounter occurs.
 * @param threshold d20 threshold: an encounter occurs on a roll <= threshold
 *   (0 = never, 20 = always)
 */
export function rollEncounterOccurs(threshold: number): EncounterRollResult {
  if (threshold <= 0) {
    return { roll: null, triggered: false };
  }
  const roll = rollDice('1d20');
  return { roll, triggered: roll <= threshold };
}
