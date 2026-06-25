import {
  hexSort as hexIdSort,
  isValidHexFormat,
  parseHexId as coreParseHexId,
} from '@achm/core';

import { renderBulletMarkdown } from './markdown.ts';
import { processTreasure } from './treasure.ts';

import type {
  BeatMapEntry,
  ExtendedGmNote,
  ExtendedHexData,
  ExtendedHiddenSites,
  RegionEntry,
  ResolvedHexData,
  RoleplayBookMapEntry,
} from '../types.ts';
import type { CoordinateNotation } from '@achm/core';
import type { GmNote, HexData, HiddenSite, RegionData } from '@achm/schemas';
import type { CollectionEntry } from 'astro:content';

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
    regionName: region?.data.name ?? 'Unknown',
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

/**
 * Collect the string refs stored in a named anchor array (`beats` /
 * `roleplayBooks`) across the landmark + hidden sites of the given hexes.
 * Resolving only anchored refs means a page never has to load every beat or book
 * in the campaign.
 */
export function collectAnchoredRefs(
  hexes: HexData[],
  field: 'beats' | 'roleplayBooks',
): Set<string> {
  const refs = new Set<string>();
  const pull = (feature: unknown): void => {
    if (!feature || typeof feature !== 'object') return;
    const arr = (feature as Record<string, unknown>)[field];
    if (!Array.isArray(arr)) return;
    for (const ref of arr) {
      if (typeof ref === 'string') refs.add(ref);
    }
  };
  for (const hex of hexes) {
    pull(hex.landmark);
    if (Array.isArray(hex.hiddenSites)) {
      hex.hiddenSites.forEach(pull);
    }
  }
  return refs;
}

/**
 * Build a beat lookup for the beats anchored on the given hexes. A beat's
 * `trigger` is rendered markdown, so resolving only the anchored beats (not the
 * whole collection) keeps the page cheap. Beat IDs are canonical
 * `plotlineSlug/beatSlug`; a dangling anchor is omitted, so the list components
 * render "(not found)".
 */
export async function buildHexBeatMap(
  hexes: HexData[],
  beats: CollectionEntry<'beats'>[],
): Promise<Record<string, BeatMapEntry>> {
  const beatById = new Map(
    beats.map((b) => [`${b.data.plotline}/${b.data.slug}`, b.data]),
  );
  const beatMap: Record<string, BeatMapEntry> = {};
  for (const beatId of collectAnchoredRefs(hexes, 'beats')) {
    const beatData = beatById.get(beatId);
    if (!beatData) continue;
    beatMap[beatId] = {
      id: beatId,
      title: beatData.title,
      triggerHtml: beatData.trigger
        ? await renderBulletMarkdown(beatData.trigger)
        : '',
    };
  }
  return beatMap;
}

/**
 * Build a roleplay-book lookup for the books reminded at the given hexes'
 * features. Books are keyed by their collection id (the file slug, e.g.
 * "fort-dagaric"). Surface-as-reminder: only the title + link is exposed, never
 * the book's contents. A dangling anchor is omitted, so the list component
 * renders "(not found)".
 */
export function buildHexRoleplayBookMap(
  hexes: HexData[],
  books: CollectionEntry<'roleplay-books'>[],
): Record<string, RoleplayBookMapEntry> {
  const bookById = new Map(books.map((b) => [b.id, b.data]));
  const bookMap: Record<string, RoleplayBookMapEntry> = {};
  for (const bookId of collectAnchoredRefs(hexes, 'roleplayBooks')) {
    const bookData = bookById.get(bookId);
    if (!bookData) continue;
    bookMap[bookId] = { id: bookId, name: bookData.name };
  }
  return bookMap;
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
