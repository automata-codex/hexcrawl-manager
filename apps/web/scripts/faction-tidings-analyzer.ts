/**
 * Pure gather core for the faction tidings authoring aid.
 *
 * `faction-tidings-aid.ts` handles I/O and exit codes; this module is pure
 * so it can be exercised directly from unit tests. It is also intended as
 * the engine behind a future "live threads for this faction" panel on
 * `/gm-reference/factions/[id]` — keep it free of CLI concerns.
 *
 * Known residual (documented, not fixed): body-derivation matches proper
 * faction names only, so a plotline that refers to a faction obliquely
 * ("the kobolds") will not link it here. The beat-tiding coverage tool
 * backstops this; if oblique-reference misses bite in practice, the fix is
 * faction aliases.
 */

import { normalizeName, parseBodyMentions } from './plotline-refs-analyzer.js';

// --- Types ----------------------------------------------------------------

export interface TidingsFactionEntity {
  id: string;
  name: string;
  plotlines?: string[];
}

export interface TidingsPlotlineFile {
  slug: string;
  title: string;
  body: string;
}

/**
 * A beat file discovered on disk, with the frontmatter fields the gather
 * needs. `parentPlotlineSlug` comes from the directory layout.
 */
export interface TidingsBeatFile {
  slug: string;
  parentPlotlineSlug: string;
  title: string;
  status?: string;
  campaignStatus?: string;
  factions?: string[];
}

export interface TidingsClueEntity {
  id: string;
  name: string;
  factions?: string[];
  plotlines?: string[];
  status?: string;
  campaignStatus?: string;
}

export interface GatherInput {
  factions: TidingsFactionEntity[];
  plotlines: TidingsPlotlineFile[];
  beats: TidingsBeatFile[];
  clues: TidingsClueEntity[];
}

export type PlotlineSource = 'explicit' | 'body';

export type SurfaceTag = 'direct' | `via-plotline:${string}`;

export interface SurfacedPlotline {
  slug: string;
  sources: PlotlineSource[];
}

export interface SurfacedItem {
  /** Compound `<plotlineSlug>/<beatSlug>` for beats; the clue id for clues. */
  id: string;
  label: string;
  /** How the item surfaced; `direct` sorts first when both apply. */
  via: SurfaceTag[];
}

export interface FactionThreads {
  factionId: string;
  factionName: string;
  plotlines: SurfacedPlotline[];
  beats: SurfacedItem[];
  clues: SurfacedItem[];
}

// --- Live filters -----------------------------------------------------------

// Surfacing is read-only: these predicates only select, never write status.
const LIVE_BEAT_STATUSES = new Set(['pending', 'active']);

function isLiveBeat(beat: TidingsBeatFile): boolean {
  return (
    LIVE_BEAT_STATUSES.has(beat.status ?? 'pending') &&
    (beat.campaignStatus ?? 'active') === 'active'
  );
}

function isLiveClue(clue: TidingsClueEntity): boolean {
  return (
    (clue.status ?? 'unknown') === 'unknown' &&
    (clue.campaignStatus ?? 'active') === 'active'
  );
}

// --- Gather -----------------------------------------------------------------

/**
 * Resolve, for every plotline, the set of faction ids its body mentions.
 * Matches direct ids first, then case-folded names, mirroring the
 * plotline-refs analyzer's resolution semantics.
 */
export function resolveBodyFactions(
  plotlines: TidingsPlotlineFile[],
  factions: TidingsFactionEntity[],
): Map<string, Set<string>> {
  const ids = new Set(factions.map((f) => f.id));
  const idsByName = new Map(factions.map((f) => [normalizeName(f.name), f.id]));
  const out = new Map<string, Set<string>>();
  for (const plotline of plotlines) {
    const mentions = parseBodyMentions(plotline.body);
    const resolved = new Set<string>();
    for (const id of mentions.factionIds) {
      if (ids.has(id)) resolved.add(id);
    }
    for (const name of mentions.factionNames) {
      const id = idsByName.get(normalizeName(name));
      if (id) resolved.add(id);
    }
    out.set(plotline.slug, resolved);
  }
  return out;
}

function sortTags(via: SurfaceTag[]): SurfaceTag[] {
  return via.sort((a, b) => {
    if (a === 'direct') return -1;
    if (b === 'direct') return 1;
    return a.localeCompare(b);
  });
}

/**
 * Gather the live beats and clues surfaced under one faction, each tagged
 * with how it surfaced (`direct` vs `via-plotline:<slug>`). Over-inclusion
 * is intended: better to show a via-plotline item the author then judges
 * irrelevant than to miss one.
 *
 * @param bodyFactions - Optional precomputed `resolveBodyFactions` result,
 *   so callers iterating every faction parse each plotline body only once.
 */
export function gatherFactionThreads(
  input: GatherInput,
  factionId: string,
  bodyFactions?: Map<string, Set<string>>,
): FactionThreads {
  const faction = input.factions.find((f) => f.id === factionId);
  if (!faction) {
    throw new Error(`Unknown faction id: ${factionId}`);
  }
  const bodyResolved =
    bodyFactions ?? resolveBodyFactions(input.plotlines, input.factions);

  // Faction → plotline set: union of the explicit field and body-derivation,
  // with provenance kept per slug.
  const plotlineSources = new Map<string, PlotlineSource[]>();
  for (const slug of faction.plotlines ?? []) {
    plotlineSources.set(slug, ['explicit']);
  }
  for (const [slug, resolved] of bodyResolved) {
    if (!resolved.has(factionId)) continue;
    const sources = plotlineSources.get(slug);
    if (sources) sources.push('body');
    else plotlineSources.set(slug, ['body']);
  }

  const beats: SurfacedItem[] = [];
  for (const beat of input.beats) {
    if (!isLiveBeat(beat)) continue;
    const via: SurfaceTag[] = [];
    if (beat.factions?.includes(factionId)) via.push('direct');
    if (plotlineSources.has(beat.parentPlotlineSlug)) {
      via.push(`via-plotline:${beat.parentPlotlineSlug}`);
    }
    if (via.length === 0) continue;
    beats.push({
      id: `${beat.parentPlotlineSlug}/${beat.slug}`,
      label: beat.title,
      via: sortTags(via),
    });
  }

  const clues: SurfacedItem[] = [];
  for (const clue of input.clues) {
    if (!isLiveClue(clue)) continue;
    const via: SurfaceTag[] = [];
    if (clue.factions?.includes(factionId)) via.push('direct');
    for (const slug of clue.plotlines ?? []) {
      if (plotlineSources.has(slug)) via.push(`via-plotline:${slug}`);
    }
    if (via.length === 0) continue;
    clues.push({ id: clue.id, label: clue.name, via: sortTags(via) });
  }

  const bySlug = (a: { slug: string }, b: { slug: string }): number =>
    a.slug.localeCompare(b.slug);
  const byId = (a: SurfacedItem, b: SurfacedItem): number =>
    a.id.localeCompare(b.id);

  return {
    factionId,
    factionName: faction.name,
    plotlines: [...plotlineSources.entries()]
      .map(([slug, sources]) => ({ slug, sources }))
      .sort(bySlug),
    beats: beats.sort(byId),
    clues: clues.sort(byId),
  };
}

/** Gather threads for every faction, ordered by faction id. */
export function gatherAllFactionThreads(input: GatherInput): FactionThreads[] {
  const bodyFactions = resolveBodyFactions(input.plotlines, input.factions);
  return [...input.factions]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((f) => gatherFactionThreads(input, f.id, bodyFactions));
}

// --- Reporting ------------------------------------------------------------

export function formatThreadsReport(threads: FactionThreads[]): string {
  if (threads.length === 0) return 'No factions found.\n';

  const sections: string[] = [];
  for (const t of threads) {
    const lines: string[] = [`Faction: ${t.factionName} (${t.factionId})`];

    if (t.plotlines.length > 0) {
      lines.push('  Plotlines:');
      for (const p of t.plotlines) {
        lines.push(`    - ${p.slug}  [${p.sources.join(', ')}]`);
      }
    } else {
      lines.push('  Plotlines: (none)');
    }

    if (t.beats.length > 0) {
      lines.push('  Live beats:');
      for (const b of t.beats) {
        lines.push(`    - ${b.id}  (${b.label})  [${b.via.join(', ')}]`);
      }
    } else {
      lines.push('  Live beats: (none)');
    }

    if (t.clues.length > 0) {
      lines.push('  Live clues:');
      for (const c of t.clues) {
        lines.push(`    - ${c.id}  (${c.label})  [${c.via.join(', ')}]`);
      }
    } else {
      lines.push('  Live clues: (none)');
    }

    sections.push(lines.join('\n'));
  }
  return sections.join('\n\n') + '\n';
}
