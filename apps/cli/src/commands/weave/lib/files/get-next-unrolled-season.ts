import { normalizeSeasonId, parseSeasonId } from '@skyreach/core';
import { SEASON_ORDER } from '@skyreach/schemas';

export function getNextUnrolledSeason(meta: any): string | null {
  // meta.rolledSeasons is sorted chronologically; find the next season after the last rolled
  if (!meta.rolledSeasons || meta.rolledSeasons.length === 0) {
    return null;
  }
  const last = meta.rolledSeasons[meta.rolledSeasons.length - 1];

  // Next season: increment season (wrap to next year if autumn)
  const { season, year } = parseSeasonId(last);
  let idx = SEASON_ORDER.indexOf(season);
  if (idx === -1) {
    return null;
  }

  idx = (idx + 1) % 4;
  const nextYear = idx === 0 ? year + 1 : year;
  return normalizeSeasonId(`${nextYear}-${SEASON_ORDER[idx]}`);
}
