/**
 * Checks if a given string is a valid hex ID.
 * @param hexId
 */
export function isValidHexId(hexId: string): boolean {
  const match = hexId.match(/^([A-Za-z])(\d+)$/);
  return !!match;
}
