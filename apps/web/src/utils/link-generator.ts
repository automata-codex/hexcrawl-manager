/**
 * Utility functions for generating links from linkType/linkId pairs.
 * Used by intelligence reports, hidden sites, and other components that
 * reference content by type and ID.
 */

import {
  getBeatPath,
  getCluePath,
  getDungeonPath,
  getEncounterPath,
  getFactionPath,
  getHexPath,
  getRegionPath,
} from '../config/routes';

import type { LinkType } from '@achm/schemas';

/**
 * Generate the URL path for a link based on its type and ID.
 */
export function getLinkPath(linkType: LinkType, linkId: string): string {
  switch (linkType) {
    case 'encounter':
      return getEncounterPath(linkId);
    case 'dungeon':
      return getDungeonPath(linkId);
    case 'clue':
      return getCluePath(linkId);
    case 'hex':
      return getHexPath(linkId);
    case 'region':
      return getRegionPath(linkId);
    case 'faction':
      return getFactionPath(linkId);
    case 'beat':
      return getBeatPath(linkId);
    default:
      return '#';
  }
}

/**
 * Generate display text for a link based on its type and ID.
 * Formats the type nicely and uses the ID as the label.
 */
export function getLinkText(linkType: LinkType, linkId: string): string {
  const typeLabels: Record<LinkType, string> = {
    beat: 'Beat',
    clue: 'Clue',
    dungeon: 'Dungeon',
    encounter: 'Encounter',
    faction: 'Faction',
    hex: 'Hex',
    region: 'Region',
  };

  // Beat IDs are compound ("plotlineSlug/beatSlug"); label with the beat slug only
  const idForLabel =
    linkType === 'beat' ? (linkId.split('/')[1] ?? linkId) : linkId;

  // Format the ID nicely (convert kebab-case to Title Case)
  const formattedId = idForLabel
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return `${typeLabels[linkType]}: ${formattedId}`;
}
