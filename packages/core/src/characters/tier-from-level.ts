// Derive AP tier from character level
export function tierFromLevel(level?: number): 1|2|3|4 {
  if (level === undefined) return 1;
  if (level >= 1 && level <= 4) return 1;
  if (level >= 5 && level <= 10) return 2;
  if (level >= 11 && level <= 16) return 3;
  if (level >= 17 && level <= 20) return 4;
  // fallback for out-of-range
  return 1;
}
