export function getHexColumn(hexId: string): string {
  return hexId.substring(0, 1);
}

export function getHexRow(hexId: string): number {
  return parseInt(hexId.substring(1), 10);
}

/**
 * Sorts two hex IDs first by column (alphabetically) and then by row (numerically).
 * @param hexIdA
 * @param hexIdB
 */
export function hexSort(hexIdA: string, hexIdB: string): number {
  const aCol = getHexColumn(hexIdA);
  const aRow = getHexRow(hexIdA);
  const bCol = getHexColumn(hexIdB);
  const bRow = getHexRow(hexIdB);
  if (aCol === bCol) {
    return aRow - bRow;
  } else {
    return aCol.localeCompare(bCol);
  }
}
