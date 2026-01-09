import { normalizeSeasonId, parseSeasonId } from '@achm/core';
import { SEASON_ORDER, type MetaV2Data } from '@achm/schemas';

export function getNextUnrolledSeason(meta: MetaV2Data): string | null {
  // meta.state.trails.applied.seasons is sorted chronologically; find the next season after the last rolled
  const seasons = meta.state.trails.applied?.seasons ?? [];
  if (seasons.length === 0) {
    return null;
  }
  const last = seasons[seasons.length - 1];

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
