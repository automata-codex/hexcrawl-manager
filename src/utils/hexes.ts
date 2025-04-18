import type { ExtendedHexData, ExtendedTreasureData, HexData, HiddenSitesData } from '../types.ts';
import { renderBulletMarkdown } from './markdown.ts';
import { processTreasure } from './treasure.ts';

function isObjectArray(arr: any[]): arr is { description: string }[] {
  return typeof arr[0] === 'object' && 'description' in arr[0];
}

function renderHiddenSites(
  hiddenSites: HiddenSitesData[] | string[]
): Promise<{ description: string; treasure?: ExtendedTreasureData[]; }>[] {
  if (isObjectArray(hiddenSites)) {
    return hiddenSites.map(async (site) => ({
      description: await renderBulletMarkdown(site.description),
      treasure: await processTreasure(site.treasure),
    }));
  } else {
    return hiddenSites.map(async (site) => ({
      description: await renderBulletMarkdown(site),
    }));
  }
}

export async function processHex(hex: HexData): Promise<ExtendedHexData> {
  return {
    ...hex,
    renderedHiddenSites: await Promise.all(renderHiddenSites(hex.hiddenSites ?? [])),
    renderedNotes: await Promise.all(hex.notes?.map(renderBulletMarkdown) ?? []),
    renderedLandmark: await renderBulletMarkdown(hex.landmark),
    renderedSecretSite: await renderBulletMarkdown(hex.secretSite ?? ''),
  };
}

