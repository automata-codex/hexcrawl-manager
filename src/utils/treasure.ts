import { startCase, toLower } from 'lodash-es';

import { renderBulletMarkdown } from './markdown.ts';

import type { ExtendedTreasureData, TreasureData } from '../types.ts';

export function formatValue(value?: number): string {
  return value != null ? `${value} gp` : '—';
}

export function formatRarity(rarity?: string): string {
  return rarity ? startCase(toLower(rarity)) : '—';
}

export function formatType(type?: string): string {
  return type ? startCase(toLower(type)) : '—';
}

export async function formatNotes(notes?: string): Promise<string> {
  return notes ? await renderBulletMarkdown(notes) : '—';
}

export async function processTreasure(
  treasures?: TreasureData[],
): Promise<ExtendedTreasureData[]> {
  if (!treasures) {
    return [];
  }
  return Promise.all(
    treasures.map(async (treasure) => ({
      ...treasure,
      renderedNotes: await formatNotes(treasure.notes),
    })),
  );
}
