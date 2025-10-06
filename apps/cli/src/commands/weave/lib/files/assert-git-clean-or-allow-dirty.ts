import { DirtyGitError, isGitDirty } from '@skyreach/data';

export function assertCleanGitOrAllowDirty(opts?: { allowDirty?: boolean }) {
  if (opts?.allowDirty) {
    return;
  }
  if (isGitDirty()) {
    throw new DirtyGitError();
  }
}
