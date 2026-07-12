import { RoleplayBookSchema, type RoleplayBookData } from '@achm/schemas';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

import { REPO_PATHS } from './repo-paths.js';

/**
 * Roleplay books live as plain YAML at `data/roleplay-books/<slug>.{yml,yaml}`.
 * A book's canonical reference is its file slug (the basename without the
 * extension), e.g. "fort-dagaric" — the same form hex anchors use in
 * `landmark.roleplayBooks` / `hiddenSites[].roleplayBooks`. (The book's
 * `keyword` field is a separate thing, used only for encounter-page NPC
 * matching; it is not the reference key.)
 *
 * This is the data-layer counterpart to the hex→book anchor validator and the
 * in-CLI arrival surfacing: the validator only needs the set of resolvable
 * slugs, whereas surfacing also needs each book's `name` (its display title),
 * so this loader returns validated `RoleplayBookData` keyed by slug.
 *
 * Like the beat loader, a file whose contents fail `RoleplayBookSchema` is
 * skipped rather than resolved by filename. For the surfacing path that is the
 * safe behavior — a malformed book simply does not surface — and the strict
 * build-time reference check guarantees every anchored book resolves.
 */

const BOOK_EXTENSIONS = ['.yml', '.yaml'];

/**
 * Parse and validate a single roleplay-book file's contents. Returns the
 * validated `RoleplayBookData`, or null if the file contains malformed YAML or
 * fails `RoleplayBookSchema` validation. Pure — no file I/O — so the parsing and
 * skip rules are testable from raw strings.
 */
export function parseRoleplayBookFile(raw: string): RoleplayBookData | null {
  let parsed: unknown;
  try {
    parsed = yaml.parse(raw);
  } catch {
    return null;
  }
  const result = RoleplayBookSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/**
 * Load every roleplay book under `data/roleplay-books/`, keyed by file slug
 * (basename without extension). Files that fail validation are skipped. Returns
 * an empty map when the directory is absent.
 *
 * Uncached: callers that read this repeatedly in a session (e.g. arrival-alert
 * surfacing) should cache the derived lookup themselves, mirroring the clue and
 * beat loaders.
 */
export function loadRoleplayBooks(): Map<string, RoleplayBookData> {
  const books = new Map<string, RoleplayBookData>();
  const dir = REPO_PATHS.ROLEPLAY_BOOKS();
  if (!fs.existsSync(dir)) return books;

  for (const entry of fs.readdirSync(dir, { recursive: true })) {
    const rel = entry.toString();
    const ext = BOOK_EXTENSIONS.find((e) => rel.endsWith(e));
    if (!ext) continue;
    const full = path.join(dir, rel);

    let book: RoleplayBookData | null;
    try {
      book = parseRoleplayBookFile(fs.readFileSync(full, 'utf8'));
    } catch {
      // Unreadable file — a data problem for the validators, not for
      // in-session play. Skip it.
      continue;
    }
    if (!book) continue;
    books.set(path.basename(rel, ext), book);
  }

  return books;
}
