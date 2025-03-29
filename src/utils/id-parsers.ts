export function getHexColumn(hexId: string): string {
  return hexId.substring(0, 1);
}

export function getHexRow(hexId: string): number {
  return parseInt(hexId.substring(1), 10);
}

export function getRegionNumber(regionId: string): number {
  const regionNumber = regionId.split('-')[1];
  return parseInt(regionNumber, 10);
}

export function getRegionTitle(regionId: string): string {
  const regionNumber = getRegionNumber(regionId);
  return `Region ${regionNumber}`;
}

export function regionIdCompare(a: string, b: string): number {
  const aRegionNumber = getRegionNumber(a);
  const bRegionNumber = getRegionNumber(b);
  return aRegionNumber - bRegionNumber;
}
