import { ScribeEvent } from '@achm/schemas';

export function getRolloverSeasonId(ev: ScribeEvent): string | undefined {
  if (ev.kind !== 'season_rollover') return undefined;
  return ev.payload?.seasonId as string;
}
