import type { KeyedEncounter } from '@achm/schemas';

/**
 * Interface lines announcing a hex's keyed encounters. Names the encounter ids
 * so the GM knows what to run; the encounter content itself stays GM-side.
 */
export function formatKeyedEncounterLines(
  hexId: string,
  keyed: KeyedEncounter[],
): string[] {
  if (keyed.length === 0) {
    return [];
  }
  const ids = keyed.map((ke) => ke.encounterId).join(', ');
  return [`⚔️ Keyed encounter(s) at ${hexId}: ${ids}.`];
}

/**
 * Session-log note recording why fast travel paused at a hex with a keyed
 * encounter. One line, consistent with the encounter and hex-alert notes.
 * Unlike a random encounter check, a keyed encounter is scripted — it always
 * triggers — so the note names the encounter(s) rather than prompting a roll.
 */
export function makeKeyedEncounterNote(
  hexId: string,
  keyed: KeyedEncounter[],
): string {
  const ids = keyed.map((ke) => ke.encounterId).join(', ');
  return `Keyed encounter at ${hexId}: ${ids}. Resolve it, then \`fast resume\`.`;
}
