import type {
  BeatData,
  PlotlineBeatData,
  PlotlineBeatStatus,
} from '@achm/schemas';
import { normalizeClueRef } from '@achm/schemas';

export interface ResolvedRef {
  id: string;
  name: string;
  found: boolean;
}

export interface ResolvedClueRef extends ResolvedRef {
  clueStatus?: string;
}

export interface ResolvedBeat {
  title: string;
  status: PlotlineBeatStatus;
  trigger?: string;
  factions: ResolvedRef[];
  npcs: ResolvedRef[];
  clues: ResolvedClueRef[];
  notes?: string;
}

/**
 * Resolved shape for a standalone beat entity (the new `beats` content
 * collection). Distinct from `ResolvedBeat` because the schema field
 * names differ: standalone beats expose `drivers` (faction slugs)
 * rather than the inline `factions` field. The inline `ResolvedBeat`
 * and its `resolveBeats` are removed in Phase 5 once migration is done.
 */
export interface ResolvedBeatEntity {
  slug: string;
  title: string;
  plotline: string;
  status: PlotlineBeatStatus;
  trigger?: string;
  drivers: ResolvedRef[];
  npcs: ResolvedRef[];
  clues: ResolvedClueRef[];
}

export interface BeatLookups {
  npcsById: Map<string, { displayName: string }>;
  factionsById: Map<string, { name: string }>;
  cluesById: Map<string, { name: string; status?: string }>;
}

export function resolveBeats(
  beats: PlotlineBeatData[] | undefined,
  lookups: BeatLookups,
): ResolvedBeat[] {
  if (!beats) return [];
  return beats.map((beat) => ({
    title: beat.title,
    status: beat.status,
    trigger: beat.trigger,
    factions: (beat.factions ?? []).map((id) => {
      const data = lookups.factionsById.get(id);
      return { id, name: data?.name ?? id, found: data !== undefined };
    }),
    npcs: (beat.npcs ?? []).map((id) => {
      const data = lookups.npcsById.get(id);
      return { id, name: data?.displayName ?? id, found: data !== undefined };
    }),
    clues: (beat.clues ?? []).map((ref) => {
      const { id } = normalizeClueRef(ref);
      const data = lookups.cluesById.get(id);
      return {
        id,
        name: data?.name ?? id,
        found: data !== undefined,
        clueStatus: data?.status,
      };
    }),
    notes: beat.notes,
  }));
}

export function resolveBeat(
  beat: BeatData,
  lookups: BeatLookups,
): ResolvedBeatEntity {
  return {
    slug: beat.slug,
    title: beat.title,
    plotline: beat.plotline,
    status: beat.status,
    trigger: beat.trigger,
    drivers: (beat.drivers ?? []).map((id) => {
      const data = lookups.factionsById.get(id);
      return { id, name: data?.name ?? id, found: data !== undefined };
    }),
    npcs: (beat.npcs ?? []).map((id) => {
      const data = lookups.npcsById.get(id);
      return { id, name: data?.displayName ?? id, found: data !== undefined };
    }),
    clues: (beat.clues ?? []).map((ref) => {
      const { id } = normalizeClueRef(ref);
      const data = lookups.cluesById.get(id);
      return {
        id,
        name: data?.name ?? id,
        found: data !== undefined,
        clueStatus: data?.status,
      };
    }),
  };
}
