import { statusAp } from './status-ap';

type StatusArgs = {
  mode?: 'ap';
};

export async function status(opts: StatusArgs = {}): Promise<void> {
  const mode = opts.mode ?? 'ap';

  switch (mode) {
    case 'ap': {
      const { apByCharacter, absenceAwards } = await statusAp();

      // AP-by-character table
      console.log('AP Status by Character:');
      console.log('-------------------------------------------------');
      console.log('Character ID      Combat   Exploration   Social');
      console.log('-------------------------------------------------');

      const pad = (s: string, n: number) => s.padEnd(n, ' ');

      for (const [characterId, ap] of Object.entries(apByCharacter)) {
        console.log(
          `${pad(characterId, 16)}${pad(ap.combat.toString(), 9)}${pad(
            ap.exploration.toString(),
            14,
          )}${pad(ap.social.toString(), 7)}`,
        );
      }
      console.log('-------------------------------------------------');

      // Unclaimed absence awards table
      console.log('\nUnclaimed Absence Awards:');
      console.log('-------------------------------------------------');
      console.log('Character         Eligible  Claimed  Unclaimed');
      console.log('-------------------------------------------------');

      for (const row of absenceAwards) {
        console.log(
          `${pad(row.displayName, 17)}${pad(
            row.eligibleMissed.toString(),
            9,
          )}${pad(row.claimed.toString(), 8)}${pad(
            row.unclaimed.toString(),
            10,
          )}`,
        );
      }
      console.log('-------------------------------------------------');

      return;
    }

    default:
      throw new Error(`Unknown status mode: ${String(mode)}`);
  }
}
