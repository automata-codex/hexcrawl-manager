export function isValidHexId(hexId: string): boolean {
  const match = hexId.match(/^([A-Za-z])(\d+)$/);
  return !!match;
}
