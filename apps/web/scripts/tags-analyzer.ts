/**
 * Pure analysis core for the beat tag vocabulary validator.
 *
 * `validate-tags.ts` handles I/O and exit codes; this module is pure so it
 * can be exercised directly from unit tests.
 *
 * Beat `tags` are free-form in the schema; the blessed vocabulary lives in
 * `data/tags.yaml` (keyed by domain, `beat` first) so it stays editable
 * mid-prep without codegen. This analyzer flags every beat tag not in the
 * vocabulary, grouped by tag so cleanup is one decision per tag — bless,
 * collapse, or drop.
 */

// --- Types ----------------------------------------------------------------

/** A beat file with the fields the tag check needs. */
export interface BeatTagsFile {
  slug: string;
  parentPlotlineSlug: string;
  tags?: string[];
}

/** One off-vocabulary tag and every beat using it. */
export interface TagWarning {
  tag: string;
  /** Compound `<plotlineSlug>/<beatSlug>` ids, sorted. */
  beatIds: string[];
}

// --- Vocabulary parsing -----------------------------------------------------

/**
 * Extract the `beat` vocabulary from a parsed tags.yaml document.
 * Returns null when the document has no usable `beat` string list, so the
 * caller can distinguish "empty vocabulary" from "malformed/missing".
 */
export function parseBeatVocabulary(doc: unknown): string[] | null {
  if (typeof doc !== 'object' || doc === null) return null;
  const beat = (doc as Record<string, unknown>).beat;
  if (!Array.isArray(beat)) return null;
  return beat.filter((t): t is string => typeof t === 'string');
}

// --- Analysis ---------------------------------------------------------------

/**
 * Flag every beat tag not in the vocabulary, grouped by tag. Warnings are
 * ordered by use count (descending), then alphabetically — the triage
 * worklist starts with the biggest offenders.
 */
export function analyzeBeatTags(
  beats: BeatTagsFile[],
  vocabulary: Set<string>,
): TagWarning[] {
  const beatsByTag = new Map<string, Set<string>>();
  for (const beat of beats) {
    const compoundId = `${beat.parentPlotlineSlug}/${beat.slug}`;
    for (const tag of beat.tags ?? []) {
      if (vocabulary.has(tag)) continue;
      let ids = beatsByTag.get(tag);
      if (!ids) {
        ids = new Set();
        beatsByTag.set(tag, ids);
      }
      ids.add(compoundId);
    }
  }
  return [...beatsByTag.entries()]
    .map(([tag, ids]) => ({ tag, beatIds: [...ids].sort() }))
    .sort(
      (a, b) =>
        b.beatIds.length - a.beatIds.length || a.tag.localeCompare(b.tag),
    );
}

// --- Reporting ------------------------------------------------------------

export function formatTagReport(warnings: TagWarning[]): string {
  if (warnings.length === 0) {
    return 'All beat tags are in the blessed vocabulary.\n';
  }

  const lines: string[] = [
    'Off-vocabulary beat tags (bless in tags.yaml, collapse to a blessed tag, or drop):',
  ];
  for (const w of warnings) {
    const count = w.beatIds.length;
    lines.push(`  ${w.tag}  (${count} beat${count === 1 ? '' : 's'})`);
    for (const id of w.beatIds) {
      lines.push(`    - ${id}`);
    }
  }
  return lines.join('\n') + '\n';
}
