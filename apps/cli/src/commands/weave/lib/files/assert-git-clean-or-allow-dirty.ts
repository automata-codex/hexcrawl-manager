import { isGitDirty } from '@skyreach/data';

import { DirtyGitError } from '../errors';

export function assertCleanGitOrAllowDirty(opts?: { allowDirty?: boolean }) {
  if (opts?.allowDirty) {
    return;
  }
  if (isGitDirty()) {
    throw new DirtyGitError(
      'Working tree is dirty. Commit or stash changes, or use --allow-dirty.',
    );
  }
}
