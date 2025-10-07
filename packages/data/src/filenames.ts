export function getRolloverFilename(season: string): string {
  return `rollover_${season}.jsonl`;
}

export function getSessionFilename(
  sessionNumber: number,
  sessionDate: string,
  suffix?: string,
): string {
  return `session-${sessionNumber}_${sessionDate}${suffix ?? ''}.jsonl`;
}
