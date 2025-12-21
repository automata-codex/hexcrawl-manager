import { MetaV2Data } from '@achm/schemas';

export function appendToMetaAppliedSessions(meta: MetaV2Data, fileId: string) {
  if (!meta.state.trails.applied?.sessions) {
    const applied = meta.state.trails.applied || {};
    applied.sessions = [];
    meta.state.trails.applied = applied;
  }
  if (!meta.state.trails.applied?.sessions.includes(fileId)) {
    meta.state.trails.applied?.sessions.push(fileId);
  }
}
