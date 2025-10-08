/** Domain error for invalid season identifiers. */
export class SeasonIdError extends Error {
  constructor(public readonly input: string) {
    super(`Invalid seasonId: ${input}. Expected YYYY-(winter|spring|summer|autumn).`);
    this.name = 'SeasonIdError';
  }
}
