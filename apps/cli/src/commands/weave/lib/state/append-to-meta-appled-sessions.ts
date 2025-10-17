import { MetaV2Data } from '@skyreach/schemas';

export function appendToMetaAppliedSessions(meta: MetaV2Data, fileId: string) {
  if (!meta.state.trails.applied?.appliedSessions) {
    const applied = meta.state.trails.applied || {};
    applied.appliedSessions = [];
    meta.state.trails.applied = applied;
  }
  if (!meta.state.trails.applied?.appliedSessions.includes(fileId)) {
    meta.state.trails.applied?.appliedSessions.push(fileId);
  }
}
