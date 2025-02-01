export function getPointsPerLevel(level: number): number {
  if (level >= 1 && level <= 4) {
    return 2;
  } else if (level >= 5 && level <= 10) {
    return 4;
  } else if (level >= 11 && level <= 20) {
    return 6;
  }
  throw new Error(`Invalid level: ${level}`);
}
