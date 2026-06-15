/**
 * Pure analysis core for the tag vocabulary validators.
 *
 * `validate-tags.ts` handles I/O and exit codes; this module is pure so it
 * can be exercised directly from unit tests.
 *
 * `tags` are free-form in the schema; the blessed vocabulary lives in
 * `data/tags.yaml` (keyed by domain — `beat`, `hex`, ...) so it stays editable
 * mid-prep without codegen. This analyzer flags every tag not in the
 * vocabulary, grouped by tag so cleanup is one decision per tag — bless,
 * collapse, or drop.
 *
 * The generic core (`parseVocabulary`, `analyzeTags`, `formatVocabularyReport`)
 * works for any tagged domain; the `*Beat*` functions are thin, backward-
 * compatible wrappers over it.
 */

// --- Types ----------------------------------------------------------------

/** A tagged item (beat, hex, ...) with the fields the tag check needs. */
export interface TaggedItem {
  /** Stable id shown in reports (e.g. `<plotline>/<beat>` or a hex id). */
  id: string;
  tags?: string[];
}

/** One off-vocabulary tag and every item id using it. */
export interface VocabularyWarning {
  tag: string;
  /** Item ids using the tag, sorted. */
  ids: string[];
}

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
 * Extract the vocabulary for `key` from a parsed tags.yaml document.
 * Returns null when the document has no usable string list under `key`, so the
 * caller can distinguish "empty vocabulary" from "malformed/missing".
 */
export function parseVocabulary(doc: unknown, key: string): string[] | null {
  if (typeof doc !== 'object' || doc === null) return null;
  const list = (doc as Record<string, unknown>)[key];
  if (!Array.isArray(list)) return null;
  return list.filter((t): t is string => typeof t === 'string');
}

/**
 * Extract the `beat` vocabulary. Thin wrapper over {@link parseVocabulary}.
 */
export function parseBeatVocabulary(doc: unknown): string[] | null {
  return parseVocabulary(doc, 'beat');
}

// --- Analysis ---------------------------------------------------------------

/**
 * Flag every item tag not in the vocabulary, grouped by tag. Warnings are
 * ordered by use count (descending), then alphabetically — the triage
 * worklist starts with the biggest offenders.
 */
export function analyzeTags(
  items: TaggedItem[],
  vocabulary: Set<string>,
): VocabularyWarning[] {
  const idsByTag = new Map<string, Set<string>>();
  for (const item of items) {
    for (const tag of item.tags ?? []) {
      if (vocabulary.has(tag)) continue;
      let ids = idsByTag.get(tag);
      if (!ids) {
        ids = new Set();
        idsByTag.set(tag, ids);
      }
      ids.add(item.id);
    }
  }
  return [...idsByTag.entries()]
    .map(([tag, ids]) => ({ tag, ids: [...ids].sort() }))
    .sort((a, b) => b.ids.length - a.ids.length || a.tag.localeCompare(b.tag));
}

/**
 * Beat-flavored wrapper over {@link analyzeTags}: builds the compound
 * `<plotline>/<beat>` id and returns `beatIds` for backward compatibility.
 */
export function analyzeBeatTags(
  beats: BeatTagsFile[],
  vocabulary: Set<string>,
): TagWarning[] {
  const items: TaggedItem[] = beats.map((beat) => ({
    id: `${beat.parentPlotlineSlug}/${beat.slug}`,
    tags: beat.tags,
  }));
  return analyzeTags(items, vocabulary).map((w) => ({
    tag: w.tag,
    beatIds: w.ids,
  }));
}

// --- Reporting ------------------------------------------------------------

/**
 * Render a grouped off-vocabulary report for `domain` (e.g. `beat`, `hex`).
 * `itemNoun` is the per-tag count noun (defaults to `domain`).
 */
export function formatVocabularyReport(
  warnings: VocabularyWarning[],
  domain: string,
  itemNoun: string = domain,
): string {
  if (warnings.length === 0) {
    return `All ${domain} tags are in the blessed vocabulary.\n`;
  }

  const lines: string[] = [
    `Off-vocabulary ${domain} tags (bless in tags.yaml, collapse to a blessed tag, or drop):`,
  ];
  for (const w of warnings) {
    const count = w.ids.length;
    lines.push(`  ${w.tag}  (${count} ${itemNoun}${count === 1 ? '' : 's'})`);
    for (const id of w.ids) {
      lines.push(`    - ${id}`);
    }
  }
  return lines.join('\n') + '\n';
}

/**
 * Beat-flavored wrapper over {@link formatVocabularyReport}.
 */
export function formatTagReport(warnings: TagWarning[]): string {
  return formatVocabularyReport(
    warnings.map((w) => ({ tag: w.tag, ids: w.beatIds })),
    'beat',
  );
}
