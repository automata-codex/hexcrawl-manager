import type { PartyMember } from '@skyreach/schemas';

/** Check if a PartyMember is a guest PC */
export function isGuest(
  member: PartyMember,
): member is { playerName: string; characterName: string } {
  return (
    typeof member === 'object' &&
    'playerName' in member &&
    'characterName' in member
  );
}

/** Format a PartyMember for display */
export function formatPartyMember(member: PartyMember): string {
  if (isGuest(member)) {
    return `${member.characterName} (${member.playerName})`;
  }
  return member;
}

/** Convert a PartyMember to a string identifier for AP records */
export function partyMemberToString(member: PartyMember): string {
  if (isGuest(member)) {
    return `${member.playerName}:${member.characterName}`;
  }
  return member;
}

/** Check if a party member matches a given identifier (case-insensitive for regular PCs) */
export function matchesPartyMember(
  member: PartyMember,
  identifier: string,
): boolean {
  if (isGuest(member)) {
    // For guests, match against character name (case-insensitive)
    return member.characterName.toLowerCase() === identifier.toLowerCase();
  }
  return member.toLowerCase() === identifier.toLowerCase();
}
