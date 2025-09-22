import { hexSort as hexIdSort } from '../../lib/hexes/hex-sort.ts';

import { renderBulletMarkdown } from './markdown.ts';
import { processTreasure } from './treasure.ts';

import type {
  ExtendedHexData,
  ExtendedTreasureData,
  HexData,
  HiddenSitesData,
} from '../types.ts';

export function getHexSvgPath(x: number, y: number, hexWidth: number): string {
  const size = hexWidth / 2;
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    points.push(`${px},${py}`);
  }
  return points.join(' ');
}

export function hexSort(a: HexData, b: HexData): number {
  return hexIdSort(a.id, b.id);
}

export function parseHexId(id: string): { q: number; r: number } {
  const match = id.match(/^([A-Za-z])(\d+)$/);
  if (!match) throw new Error(`Invalid hex id: ${id}`);
  const [, colLetter, rowStr] = match;
  const q = colLetter.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, ...
  const r = parseInt(rowStr, 10) - 1; // 1-based to 0-based
  return { q, r };
}

export async function processHex(hex: HexData): Promise<ExtendedHexData> {
  const landmark =
    typeof hex.landmark === 'string' ? hex.landmark : hex.landmark.description;
  return {
    ...hex,
    renderedHiddenSites: await Promise.all(
      renderHiddenSites(hex.hiddenSites ?? []),
    ),
    renderedNotes: await Promise.all(
      hex.notes?.map(renderBulletMarkdown) ?? [],
    ),
    renderedLandmark: await renderBulletMarkdown(landmark),
    renderedSecretSite: await renderBulletMarkdown(hex.secretSite ?? ''),
    renderedUpdates: await Promise.all(
      hex.updates?.map(renderBulletMarkdown) ?? [],
    ),
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
  hiddenSites: HiddenSitesData[] | string[],
): Promise<{ description: string; treasure?: ExtendedTreasureData[] }>[] {
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
