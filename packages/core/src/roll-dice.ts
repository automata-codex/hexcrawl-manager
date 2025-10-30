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

/**
 * Returns a random float in [0, 1) using cryptographically secure random numbers.
 * Isomorphic: works in both browser (Web Crypto API) and Node.js (crypto module).
 */
function secureRandom(): number {
  // Browser environment: use Web Crypto API
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] / 0x100000000;
  }

  // Node.js environment: use crypto.randomBytes
  // Dynamic import to avoid bundling issues in browser environments
  try {
    const { randomBytes } = require('crypto');
    const buf = randomBytes(4);
    const val = buf.readUInt32BE(0);
    return val / 0x100000000;
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    throw new Error('No secure random number generator available');
  }
}
