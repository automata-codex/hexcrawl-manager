import {
  hexSort as hexIdSort,
  isValidHexFormat,
  parseHexId as coreParseHexId,
} from '@achm/core';

import { renderBulletMarkdown } from './markdown.ts';
import { processTreasure } from './treasure.ts';

import type { ExtendedGmNote, ExtendedHexData, ExtendedHiddenSites, RegionEntry, ResolvedHexData } from '../types.ts';
import type { CoordinateNotation } from '@achm/core';
import type { GmNote, HexData, HiddenSite, RegionData } from '@achm/schemas';

/**
 * Process a GM note into extended format with rendered markdown and optional clueId.
 */
async function processGmNote(note: GmNote): Promise<ExtendedGmNote> {
  if (typeof note === 'string') {
    return { content: await renderBulletMarkdown(note) };
  }
  return {
    content: await renderBulletMarkdown(note.description),
    clueId: note.clueId,
  };
}

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

export function hexSort(
  a: HexData,
  b: HexData,
  notation: CoordinateNotation,
): number {
  return hexIdSort(a.id, b.id, notation);
}

/**
 * Parse a hex ID into column (q) and row (r) coordinates.
 * Uses q/r naming for compatibility with axialToPixel and existing code.
 * Both values are 0-indexed.
 */
export function parseHexId(
  id: string,
  notation: CoordinateNotation,
): { q: number; r: number } {
  const { col, row } = coreParseHexId(id, notation);
  return { q: col, r: row };
}

export async function processHex(hex: ResolvedHexData): Promise<ExtendedHexData> {
  const landmark =
    typeof hex.landmark === 'string' ? hex.landmark : hex.landmark.description;
  return {
    ...hex,
    renderedHiddenSites: await Promise.all(
      renderHiddenSites(hex.hiddenSites ?? []),
    ),
    renderedNotes: await Promise.all(hex.notes?.map(processGmNote) ?? []),
    renderedLandmark: await renderBulletMarkdown(landmark),
    renderedSecretSite: await renderBulletMarkdown(hex.secretSite ?? ''),
    renderedUpdates: await Promise.all(
      hex.updates?.map(renderBulletMarkdown) ?? [],
    ),
  };
}

/**
 * Create synthetic hex data for a hex that exists only in a region definition.
 * Used when a region declares hexes but no individual hex files exist for them.
 */
export function createSyntheticHex(hexId: string, region: RegionData): HexData {
  return {
    id: hexId,
    slug: hexId,
    name: 'Unexplored',
    landmark: 'This area has not yet been explored.',
    terrain: region.terrain,
    biome: region.biome,
    isVisited: false,
    isExplored: false,
    isScouted: false,
  };
}

/**
 * Resolve hex data with region fallbacks for terrain/biome and add regionId.
 * Returns a ResolvedHexData with all region-derived fields populated.
 */
export function resolveHexWithRegion(
  hex: HexData,
  region: RegionEntry | undefined,
): ResolvedHexData {
  return {
    ...hex,
    regionId: region?.id ?? 'unknown',
    terrain: hex.terrain ?? region?.data.terrain,
    biome: hex.biome ?? region?.data.biome,
  };
}

export function isValidHexId(
  hexId: string,
  notation: CoordinateNotation,
): boolean {
  return isValidHexFormat(hexId, notation);
}

function isStringArray(arr: any[]): arr is string[] {
  return typeof arr[0] === 'string';
}

function renderHiddenSites(
  hiddenSites: HiddenSite[] | string[],
): Promise<ExtendedHiddenSites>[] {
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
