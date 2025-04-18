import { getHexColumn, getHexRow, getRegionNumber } from './id-parsers.ts';
import type { HexData } from '../types.ts';

export function hexSort(a: HexData, b: HexData): number {
  const aCol = getHexColumn(a.id);
  const aRow = getHexRow(a.id);
  const bCol = getHexColumn(b.id);
  const bRow = getHexRow(b.id);
  if (aCol === bCol) {
    return aRow - bRow;
  } else {
    return aCol.localeCompare(bCol);
  }
}

export function regionSort(a: string, b: string): number {
  const aRegionNumber = getRegionNumber(a);
  const bRegionNumber = getRegionNumber(b);
  return aRegionNumber - bRegionNumber;
}
