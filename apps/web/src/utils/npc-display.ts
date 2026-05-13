export function formatOccupation(
  occupation: string,
  charClass?: string,
  adventuringCompany?: string,
): string {
  if (occupation === 'Adventurer') {
    if (adventuringCompany) {
      return `Adventurer (${charClass}), ${adventuringCompany}`;
    }
    return `Adventurer (${charClass})`;
  }
  return occupation;
}
