import { randomBytes } from 'crypto';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Parses dice notation (e.g., "2d6+1") and rolls the dice. Uses secure RNG for
 * true randomness only (no seed support).
 */
export function rollDice(notation: string): number {
  // Regex: (\d*)d(\d+)([+-]\d+)?
  const match = notation.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!match) {
    throw new Error(`Invalid dice notation: ${notation}`);
  }

  const numDice = parseInt(match[1] || '1', 10);
  const dieSize = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(secureRandom() * dieSize) + 1;
  }
  return total + modifier;
}

// Returns a random float in [0, 1) using Node.js crypto
function secureRandom(): number {
  const buf = randomBytes(4);
  const val = buf.readUInt32BE(0);
  return val / 0x100000000;
}
