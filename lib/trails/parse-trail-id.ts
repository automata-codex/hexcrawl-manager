import { isValidHexId } from '../hexes';

export function parseTrailId(trailId: string): {
  from: string;
  to: string;
} | null {
  const [from, to] = trailId.split('-');
  if (isValidHexId(from) && isValidHexId(to)) {
    return { from, to };
  }
  return null;
}
