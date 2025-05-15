import type { ExtendedHexData, ExtendedTreasureData, HexData, HiddenSitesData } from '../types.ts';
import { renderBulletMarkdown } from './markdown.ts';
import { processTreasure } from './treasure.ts';

export function getHexNeighbors(hex: string): string[] {
  // Extract column (letter) and row (number) from the input hex string
  const match = hex.toUpperCase().match(/^([A-Z])(\d+)$/);
  if (!match) {
    throw new Error(`Invalid hex format ${hex}. Use a letter followed by a number, e.g., 'P17'.`);
  }

  const column = match[1];
  const row = parseInt(match[2], 10);

  // Convert column letter to a numerical index for calculations
  const columnIndex = column.charCodeAt(0) - "A".charCodeAt(0);

  // Determine the offsets for neighbors based on whether the column is even or odd
  const isEvenColumn = columnIndex % 2 === 0;

  // Neighboring offsets for flat-topped hex grid
  const neighborOffsets = isEvenColumn
    ? [
      { col: -1, row:  0 }, // Upper left
      { col:  0, row: -1 }, // Upper right
      { col:  1, row:  0 }, // Right
      { col:  1, row:  1 }, // Lower right
      { col:  0, row:  1 }, // Lower left
      { col: -1, row:  1 }  // Left
    ]
    : [
      { col: -1, row: -1 }, // Upper left
      { col:  0, row: -1 }, // Upper right
      { col:  1, row: -1 }, // Right
      { col:  1, row:  0 }, // Lower right
      { col:  0, row:  1 }, // Lower left
      { col: -1, row:  0 }  // Left
    ];

  // Generate the neighbors
  const neighbors = neighborOffsets.map(offset => {
    const newColumnIndex = columnIndex + offset.col;
    const newRow = row + offset.row;

    // Ensure the new column index is valid (within 0-22 for A-W)
    if (newColumnIndex < 0 || newColumnIndex > 22) {
      return null;
    }

    const newColumn = String.fromCharCode(newColumnIndex + "A".charCodeAt(0));

    // Ensure the new row is valid (within 1-27)
    if (newRow < 1 || newRow > 27) {
      return null;
    }

    return `${newColumn}${newRow}`;
  });

  // Filter out null values (invalid neighbors)
  const output = neighbors.filter(Boolean) as string[];
  return output.sort();
}

export function getHexColumn(hexId: string): string {
  return hexId.substring(0, 1);
}

export function getHexRow(hexId: string): number {
  return parseInt(hexId.substring(1), 10);
}

export function getHexSvgPath(x: number, y: number, hexWidth: number): string {
  const size = hexWidth / 2;
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (60 * i);
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    points.push(`${px},${py}`);
  }
  return points.join(" ");
}

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

export function parseHexId(id: string): { q: number, r: number } {
  const match = id.match(/^([A-Za-z])(\d+)$/);
  if (!match) throw new Error(`Invalid hex id: ${id}`);
  const [, colLetter, rowStr] = match;
  const q = colLetter.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, ...
  const r = parseInt(rowStr, 10) - 1;     // 1-based to 0-based
  return { q, r };
}

export async function processHex(hex: HexData): Promise<ExtendedHexData> {
  const landmark = typeof hex.landmark === 'string' ? hex.landmark : hex.landmark.description;
  return {
    ...hex,
    renderedHiddenSites: await Promise.all(renderHiddenSites(hex.hiddenSites ?? [])),
    renderedNotes: await Promise.all(hex.notes?.map(renderBulletMarkdown) ?? []),
    renderedLandmark: await renderBulletMarkdown(landmark),
    renderedSecretSite: await renderBulletMarkdown(hex.secretSite ?? ''),
    renderedUpdates: await Promise.all(hex.updates?.map(renderBulletMarkdown) ?? []),
  };
}

export function isValidHexId(hexId: string): boolean {
  const match = hexId.match(/^([A-Za-z])(\d+)$/);
  return !!match;
}

function isStringArray(arr: any[]): arr is string[] {
  return typeof arr[0] === 'string';
}

function renderHiddenSites(
  hiddenSites: HiddenSitesData[] | string[]
): Promise<{ description: string; treasure?: ExtendedTreasureData[]; }>[] {
  if (isStringArray(hiddenSites)) {
    return hiddenSites.map(async (site) => ({
      description: await renderBulletMarkdown(site),
    }));
  } else {
    return hiddenSites.map(async (site) => ({
      ...site,
      description: await renderBulletMarkdown(site.description),
      treasure: await processTreasure(site.treasure),
    }));
  }
}

