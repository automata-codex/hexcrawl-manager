/**
 * Build the note logged when an encounter check triggers entering a hex.
 * Fast travel does not auto-pick the encounter: it pauses at the hex and
 * prompts the GM to roll on the region table manually, then continue with
 * `fast resume`. Occurrence is decided by the caller (see
 * `rollEncounterOccurs`); this is only called once an encounter has occurred.
 *
 * @param hexId The hex being entered
 * @param threshold The d20 threshold that triggered (for the log record)
 */
export function makeEncounterNote(hexId: string, threshold: number): string {
  return `Encounter check triggered entering ${hexId} (rolled ≤ ${threshold}). Roll on the region table, resolve it, then \`fast resume\`.`;
}
