import { rollDice } from '@achm/core';

/**
 * Roll a d20 to determine if an encounter occurs.
 * For MVP, uses a hardcoded threshold of 1 (5% chance).
 * @returns true if an encounter occurs
 */
export function rollEncounterOccurs(): boolean {
  const roll = rollDice('1d20');
  return roll === 1;
}
