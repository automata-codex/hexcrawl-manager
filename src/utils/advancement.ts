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

export function getPointsToReachLevel(level: number): number {
  switch (level) {
    case 1:
      return 0;
    case 2:
      return 2;
    case 3:
      return 4;
    case 4:
      return 6;
    case 5:
      return 10;
    case 6:
      return 14;
    case 7:
      return 18;
    case 8:
      return 22;
    case 9:
      return 26;
    case 10:
      return 30;
    case 11:
      return 36;
    case 12:
      return 42;
    case 13:
      return 48;
    case 14:
      return 54;
    case 15:
      return 60;
    case 16:
      return 66;
    case 17:
      return 72;
    case 18:
      return 78;
    case 19:
      return 84;
    case 20:
      return 90;
    default:
      throw new Error(`Invalid level: ${level}`);
  }
}
