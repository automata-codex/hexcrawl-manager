import { BeatSchema, type BeatData } from '@achm/schemas';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

import { REPO_PATHS } from './repo-paths.js';

/**
 * Beats live as Markdown (with YAML frontmatter) at
 * `data/plotlines/<plotlineSlug>/beats/<beatSlug>.{md,mdx}`. A beat's canonical
 * ID is the `'beat'` LinkType reference `plotlineSlug/beatSlug` — the same form
 * hex anchors use in `landmark.beats` / `hiddenSites[].beats`.
 *
 * This is the data-layer counterpart to the hex→beat anchor validator
 * (`apps/web/scripts/validate-hex-beat-refs.ts`): the validator only needs the
 * set of resolvable IDs, whereas surfacing also needs each beat's `status`, so
 * this loader returns validated `BeatData` keyed by canonical ID.
 *
 * Divergence from the validator: a file whose frontmatter fails `BeatSchema`
 * (e.g. missing `title`) is skipped here rather than resolved by file layout.
 * For the in-session surfacing path that is the safe behavior — a malformed
 * beat simply does not surface — and the strict `validate:hex-beats` build gate
 * already guarantees every anchored beat resolves to a real file.
 */

const BEAT_EXTENSIONS = ['.md', '.mdx'];
const BEAT_DIR_SEGMENT = `${path.sep}beats${path.sep}`;

/**
 * Extract a Markdown file's leading YAML frontmatter block as raw text, or null
 * when the file has no `---`-fenced frontmatter.
 */
function extractFrontmatter(raw: string): string | null {
  if (!raw.startsWith('---')) return null;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return null;
  return raw.slice(raw.indexOf('\n') + 1, end);
}

/**
 * Parse and validate a single beat file's contents. Returns the validated
 * `BeatData`, or null if the file has no frontmatter, contains malformed YAML,
 * or fails `BeatSchema` validation. Pure — no file I/O — so the parsing and
 * skip rules are testable from raw strings.
 */
export function parseBeatFile(raw: string): BeatData | null {
  const fm = extractFrontmatter(raw);
  if (fm === null) return null;
  let parsed: unknown;
  try {
    parsed = yaml.parse(fm);
  } catch {
    return null;
  }
  const result = BeatSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/**
 * Load every beat under `data/plotlines/`, keyed by canonical
 * `plotlineSlug/beatSlug` ID. Files outside a `beats/` directory (e.g. the
 * plotline's own page) and files that fail validation are skipped. Returns an
 * empty map when the plotlines directory is absent.
 *
 * Uncached: callers that read this repeatedly in a session (e.g. arrival-alert
 * surfacing) should cache the derived lookup themselves, mirroring the clue
 * loader.
 */
export function loadBeats(): Map<string, BeatData> {
  const beats = new Map<string, BeatData>();
  const dir = REPO_PATHS.PLOTLINES();
  if (!fs.existsSync(dir)) return beats;

  for (const entry of fs.readdirSync(dir, { recursive: true })) {
    const rel = entry.toString();
    if (!BEAT_EXTENSIONS.some((ext) => rel.endsWith(ext))) continue;
    const full = path.join(dir, rel);
    if (!full.includes(BEAT_DIR_SEGMENT)) continue;

    let beat: BeatData | null;
    try {
      beat = parseBeatFile(fs.readFileSync(full, 'utf8'));
    } catch {
      // Unreadable file — a data problem for the validators, not for
      // in-session play. Skip it.
      continue;
    }
    if (!beat) continue;
    beats.set(`${beat.plotline}/${beat.slug}`, beat);
  }

  return beats;
}
