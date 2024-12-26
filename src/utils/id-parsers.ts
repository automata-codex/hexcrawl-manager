export function getHexColumn(hexId: string): string {
  return hexId.substring(0, 1);
}

export function getHexRow(hexId: string): number {
  return parseInt(hexId.substring(1), 10);
}

export function getRegionTitle(regionId: string): string {
  const regionNumber = regionId.split('-')[1];
  return `Region ${regionNumber}`;
}
