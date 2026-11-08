import { z } from 'zod';

/**
 * Unquoted numeric-notation hex IDs reach us as YAML numbers with their
 * leading zeros stripped (`0101` → 101, `-0101` → -101). Letter-number IDs
 * always contain a letter and never parse as numbers, so padding an integer
 * back to four-digit CCRR restores exactly what the author typed. Anything
 * that is not an integer is passed through untouched for the string check
 * to reject.
 */
export function restoreNumericHexId(value: unknown): unknown {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return value;
  }
  const sign = value < 0 ? '-' : '';
  return `${sign}${String(Math.abs(value)).padStart(4, '0')}`;
}

/**
 * Shape-only check for a hex spec. The schemas package does not know the
 * campaign's map config, so notation, grid bounds and out-of-bounds hexes are
 * checked when the spec is expanded (`expandHexSpecs` in `@achm/core`).
 *
 * Forms (shown in letter-number / numeric notation):
 *   - single hex:  `K7`      / `1107`
 *   - rectangle:   `F10:J14` / `0610:1014`  (corners in either order)
 *   - radius:      `M25+2`   / `1325+2`     (every hex within 2 of the center)
 *   - exclusion:   any of the above prefixed with `-`
 */
export const HexSpecSchema = z.preprocess(
  restoreNumericHexId,
  z
    .string()
    .regex(
      /^-?[A-Za-z0-9]+(?::[A-Za-z0-9]+|\+\d+)?$/,
      'Expected a hex ID (K7 / 1107), rectangle (F10:J14 / 0610:1014), ' +
        'radius (M25+2 / 1325+2), or exclusion (-G12 / -0712)',
    ),
);

export type HexSpec = z.infer<typeof HexSpecSchema>;
