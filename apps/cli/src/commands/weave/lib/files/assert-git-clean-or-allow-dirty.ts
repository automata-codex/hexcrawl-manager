import { DirtyGitError, isGitDirty } from '@achm/data';

export function assertCleanGitOrAllowDirty(opts?: { allowDirty?: boolean }) {
  if (opts?.allowDirty) {
    return;
  }
  if (isGitDirty()) {
    throw new DirtyGitError();
  }
}
