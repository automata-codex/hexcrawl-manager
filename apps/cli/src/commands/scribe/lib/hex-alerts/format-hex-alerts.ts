import { hasAlerts, type HexAlerts } from './count-hex-alerts';

/**
 * Interface lines announcing a hex's alerts on arrival. Count-only by
 * design — details stay GM-side on the hex page, not in the REPL.
 */
export function formatHexAlertLines(
  hexId: string,
  alerts: HexAlerts,
): string[] {
  const lines: string[] = [];
  if (alerts.unknownClues > 0) {
    lines.push(
      `🔍 ${alerts.unknownClues} unknown clue(s) here — see hex ${hexId}.`,
    );
  }
  if (alerts.liveBeats > 0) {
    lines.push(
      `🎭 ${alerts.liveBeats} live beat(s) anchored here — see hex ${hexId}.`,
    );
  }
  // Books name the title (not a count): the title is the pointer the GM opens.
  if (alerts.roleplayBooks.length > 0) {
    lines.push(
      `📖 Roleplay book(s) relevant here: ${alerts.roleplayBooks.join(', ')} — see hex ${hexId}.`,
    );
  }
  if (alerts.updates > 0) {
    lines.push(`📝 This hex has ${alerts.updates} GM update(s).`);
  }
  return lines;
}

/**
 * Session-log note recording why fast travel paused at a hex. One line so
 * it reads cleanly in the log alongside encounter notes.
 */
export function makeHexAlertNote(hexId: string, alerts: HexAlerts): string {
  const parts: string[] = [];
  if (alerts.unknownClues > 0) {
    parts.push(`${alerts.unknownClues} unknown clue(s)`);
  }
  if (alerts.liveBeats > 0) {
    parts.push(`${alerts.liveBeats} live beat(s)`);
  }
  // Count-only in the log note, to stay uniform with the other parts; the
  // interactive line names the book titles.
  if (alerts.roleplayBooks.length > 0) {
    parts.push(`${alerts.roleplayBooks.length} roleplay book(s)`);
  }
  if (alerts.updates > 0) {
    parts.push(`${alerts.updates} GM update(s)`);
  }
  return `Hex alert at ${hexId}: ${parts.join(', ')} — see hex ${hexId}.`;
}

export { hasAlerts };
