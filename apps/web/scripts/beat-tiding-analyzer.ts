/**
 * Pure analysis core for the beat tiding coverage tool.
 *
 * `beat-tiding-coverage.ts` handles I/O and exit codes; this module is pure
 * so it can be exercised directly from unit tests.
 *
 * Checks beat-vs-tiding coverage: which live beats are surfaced by no
 * faction tiding (`linkType: 'beat'` row in any roleplay book). This is a
 * different predicate from the plotline-refs analyzer's `orphan-beat`
 * warning, which checks beat-file-vs-plotline-`beats`-array sync.
 */

import {
  isLiveBeat,
  type TidingsBeatFile,
} from './faction-tidings-analyzer.js';

// --- Types ----------------------------------------------------------------

/** A tiding row, rolled (`rows`) or selectable (`situational`). */
export interface TidingRow {
  linkType?: string;
  linkId?: string;
}

/** The slice of a roleplay book the coverage check needs. */
export interface CoverageBook {
  name: string;
  rows: TidingRow[];
  situational: TidingRow[];
}

export interface OrphanBeat {
  /** Compound `<plotlineSlug>/<beatSlug>`. */
  id: string;
  title: string;
  status: string;
}

export interface CoverageResult {
  liveBeatCount: number;
  linkedBeatIds: Set<string>;
  /** Live beats whose compound id appears in no tiding `linkId`. */
  orphans: OrphanBeat[];
}

// --- Analysis ---------------------------------------------------------------

/** Collect every `linkId` carried by a `linkType: 'beat'` tiding row. */
export function collectLinkedBeatIds(books: CoverageBook[]): Set<string> {
  const out = new Set<string>();
  for (const book of books) {
    for (const row of [...book.rows, ...book.situational]) {
      if (row.linkType === 'beat' && row.linkId) out.add(row.linkId);
    }
  }
  return out;
}

export function analyzeBeatTidingCoverage(
  beats: TidingsBeatFile[],
  books: CoverageBook[],
): CoverageResult {
  const linkedBeatIds = collectLinkedBeatIds(books);
  const liveBeats = beats.filter(isLiveBeat);
  const orphans: OrphanBeat[] = [];
  for (const beat of liveBeats) {
    const compoundId = `${beat.parentPlotlineSlug}/${beat.slug}`;
    if (linkedBeatIds.has(compoundId)) continue;
    orphans.push({
      id: compoundId,
      title: beat.title,
      status: beat.status ?? 'pending',
    });
  }
  orphans.sort((a, b) => a.id.localeCompare(b.id));
  return { liveBeatCount: liveBeats.length, linkedBeatIds, orphans };
}

// --- Reporting ------------------------------------------------------------

export function formatCoverageReport(result: CoverageResult): string {
  const summary =
    `Beat tiding coverage: ${result.liveBeatCount} live beat(s), ` +
    `${result.linkedBeatIds.size} beat link(s) in tidings, ` +
    `${result.orphans.length} orphan(s).`;

  if (result.orphans.length === 0) {
    return `${summary}\n\nAll live beats are surfaced by at least one faction tiding.\n`;
  }

  const byPlotline = new Map<string, OrphanBeat[]>();
  for (const orphan of result.orphans) {
    const plotlineSlug = orphan.id.split('/', 1)[0];
    if (!byPlotline.has(plotlineSlug)) byPlotline.set(plotlineSlug, []);
    byPlotline.get(plotlineSlug)!.push(orphan);
  }

  const lines: string[] = [
    summary,
    '',
    'Orphan beats (live, surfaced by no faction tiding):',
  ];
  for (const [plotlineSlug, orphans] of byPlotline) {
    lines.push(`  Plotline: ${plotlineSlug}`);
    for (const o of orphans) {
      lines.push(`    - ${o.id}  (${o.title})  [${o.status}]`);
    }
  }
  return lines.join('\n') + '\n';
}
