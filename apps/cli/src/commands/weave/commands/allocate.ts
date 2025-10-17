import { error, info, makeExitMapper } from '@skyreach/cli-kit';

import { allocateAp } from './allocate-ap';

export type AllocateArgs = {
  characterId: string;
  amount: number;
  pillarSplits?: Record<string, number>;
  note?: string;
  dryRun?: boolean;
};

export const exitCodeForAllocate = makeExitMapper([
  // ...add error mappings as needed...
]);

export async function allocate(args: AllocateArgs) {
  try {
    // ...validation logic if needed...
    const result = await allocateAp(args);
    info(`AP allocated successfully: ${result}`);
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error(message);
    process.exit(exitCodeForAllocate(err));
  }
}
