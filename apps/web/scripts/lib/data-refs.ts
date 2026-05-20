/**
 * Data-Reference Resolver
 *
 * Shared registry for the `link-data-refs` / `validate-data-refs` scripts.
 *
 * Loads every content collection in `data/`, indexes each by slug, and exposes
 * resolution functions used by both the linker (slug → URL+display name) and
 * the validator (slug-or-URL → entity, route presence, drift check).
 *
 * Routing rules — confirmed from `apps/web/src/pages/`. One canonical URL per
 * entity. Visibility is downstream of routing (the page 404s for unauthorized
 * viewers), so the linker emits a single URL per type. Types listed with a
 * `null` `urlPattern` have no public route — references to them are flagged
 * by the validator rather than linked.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

import yaml from 'yaml';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EntityRecord {
  /** Lookup key (slug, id, or composite). Lowercase for hexes. */
  key: string;
  /** Raw parsed YAML/frontmatter data. */
  data: Record<string, unknown>;
  /** Type slug (e.g. 'faction', 'npc', 'beat'). */
  type: CollectionType;
  /** Path on disk for diagnostics. */
  filePath: string;
}

export interface ResolvedRef {
  type: CollectionType;
  entity: EntityRecord;
  /** Canonical URL, or `null` if the type has no public route. */
  url: string | null;
  /** Human-readable label for the link text. */
  displayName: string;
}

export interface Resolver {
  /** Look up by backtick token (e.g. "gruelith"). Optional type hint disambiguates collisions. */
  resolveSlug(slug: string, typeHint?: string | null): ResolvedRef | null;
  /** Look up by markdown link URL. Returns null if no entity matches. */
  resolveUrl(url: string): ResolvedRef | null;
  /** Try to recognise a drifted URL (wrong canonical prefix) and resolve via its slug. */
  detectDrift(url: string): ResolvedRef | null;
  /** True if this type has no public route — any reference to it is a bug. */
  isRouteless(type: CollectionType): boolean;
  /** All known collection types. */
  collectionTypes(): CollectionType[];
  /** Type-word synonyms used in prose ("encounter", "faction", "clue" …) → canonical type. */
  typeWordIndex(): Map<string, CollectionType>;
  /** Diagnostic: count of entities per type. */
  stats(): Record<string, number>;
  /** All entities of a given type. */
  entitiesOf(type: CollectionType): EntityRecord[];
  /** Canonical URL prefixes that, when present, mean the URL is claiming to be an entity link. */
  canonicalUrlPrefixes(): string[];
  /** Known wrong-prefix URL drifts. URLs starting with these are validated as entity links. */
  driftUrlPrefixes(): string[];
}

export type CollectionType =
  | 'article'
  | 'composite-article'
  | 'bounty'
  | 'character'
  | 'clue'
  | 'dungeon'
  | 'encounter'
  | 'faction'
  | 'hex'
  | 'loot-pack'
  | 'npc'
  | 'plotline'
  | 'beat'
  | 'pointcrawl'
  | 'pointcrawl-node'
  | 'pointcrawl-edge'
  | 'region'
  | 'roleplay-book'
  | 'rumor'
  | 'spell'
  | 'stat-block'
  // routeless (referenced but not linkable)
  | 'class'
  | 'encounter-category-table'
  | 'map-path'
  | 'noble'
  | 'political-faction'
  | 'player'
  | 'session'
  | 'supplement'
  | 'trail';

interface CollectionConfig {
  type: CollectionType;
  /** Synonyms used in prose ("faction `gruelith`", "the faction"). Singular + plural. */
  typeWords: string[];
  /** Subdirectory under `data/`. Use null when the collection isn't a top-level dir. */
  dir: string | null;
  /** Whether to recurse into subdirectories when loading. */
  recursive: boolean;
  /** File extensions to load. */
  extensions: readonly string[];
  /** How to compute the lookup key from parsed data. */
  buildKey: (data: Record<string, unknown>, filePath: string) => string | null;
  /** How to compute the display name. Falls back to the key uppercased if null returned. */
  buildDisplayName: (data: Record<string, unknown>) => string | null;
  /** How to compute the canonical URL. Returns null for routeless types. */
  buildUrl: ((entity: EntityRecord) => string) | null;
  /**
   * Canonical URL prefix for prefix-based detection (e.g. `/gm-reference/factions/`).
   * Use null when the URL pattern is non-uniform (articles, beats, etc.).
   */
  urlPrefix: string | null;
  /** Priority for disambiguation (lower = checked first when no type hint). */
  priority: number;
}

/**
 * Wrong-but-common URL patterns that should be normalised to the canonical
 * pattern. Each maps a prefix that URLs are *sometimes* written with to the
 * collection type that should own the slug at the end of the URL.
 */
const DRIFT_PATTERNS: ReadonlyArray<{ prefix: string; type: CollectionType }> = [
  { prefix: '/plotlines/', type: 'plotline' },
  { prefix: '/hexes/', type: 'hex' },
];

// ---------------------------------------------------------------------------
// Per-collection rules
// ---------------------------------------------------------------------------

const COLLECTIONS: readonly CollectionConfig[] = [
  {
    type: 'faction',
    typeWords: ['faction', 'factions'],
    dir: 'factions',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.name),
    buildUrl: (e) => `/gm-reference/factions/${e.key}`,
    urlPrefix: '/gm-reference/factions/',
    priority: 10,
  },
  {
    type: 'npc',
    typeWords: ['npc', 'npcs'],
    dir: 'npcs',
    recursive: false,
    extensions: ['.yaml', '.yml', '.md', '.mdx'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.displayName) ?? asString(d.name),
    buildUrl: (e) => `/players-reference/setting/npcs/${e.key}`,
    urlPrefix: '/players-reference/setting/npcs/',
    priority: 20,
  },
  {
    type: 'character',
    typeWords: ['character', 'characters', 'pc'],
    dir: 'characters',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) =>
      asString(d.displayName) ?? asString(d.fullName) ?? asString(d.name),
    buildUrl: (e) => `/gm-reference/characters/${e.key}`,
    urlPrefix: '/gm-reference/characters/',
    priority: 30,
  },
  {
    type: 'encounter',
    typeWords: ['encounter', 'encounters'],
    dir: 'encounters',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.name),
    buildUrl: (e) => `/gm-reference/encounters/${e.key}`,
    urlPrefix: '/gm-reference/encounters/',
    priority: 40,
  },
  {
    type: 'clue',
    typeWords: ['clue', 'clues'],
    dir: 'clues',
    recursive: false,
    extensions: ['.yaml', '.yml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.name),
    buildUrl: (e) => `/session-toolkit/clues/${e.key}`,
    urlPrefix: '/session-toolkit/clues/',
    priority: 50,
  },
  {
    type: 'plotline',
    typeWords: ['plotline', 'plotlines'],
    dir: 'plotlines',
    recursive: true,
    extensions: ['.md', '.mdx'],
    // Plotline files live at data/plotlines/<slug>/<slug>.{md,mdx} or
    // data/plotlines/<slug>.{md,mdx}. Identify them via frontmatter `slug` AND
    // (absence of a `plotline:` field, which marks beats).
    buildKey: (d) => (isPlotlineFrontmatter(d) ? asString(d.slug) : null),
    buildDisplayName: (d) => asString(d.title),
    buildUrl: (e) => `/gm-reference/plotlines/${e.key}`,
    urlPrefix: '/gm-reference/plotlines/',
    priority: 60,
  },
  {
    type: 'beat',
    typeWords: ['beat', 'beats'],
    dir: 'plotlines',
    recursive: true,
    extensions: ['.md', '.mdx'],
    buildKey: (d) =>
      isBeatFrontmatter(d) ? asString(d.slug) : null,
    buildDisplayName: (d) => asString(d.title),
    buildUrl: (e) => {
      const parentSlug = asString(e.data.plotline);
      if (!parentSlug) return `/gm-reference/plotlines/unknown/beats/${e.key}`;
      return `/gm-reference/plotlines/${parentSlug}/beats/${e.key}`;
    },
    urlPrefix: null, // non-uniform: nested under parent plotline slug
    priority: 65,
  },
  {
    type: 'article',
    typeWords: ['article', 'articles'],
    dir: 'articles',
    recursive: true,
    extensions: ['.md', '.mdx'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.title),
    // Articles use their `slug` frontmatter field verbatim as the URL.
    buildUrl: (e) => asString(e.data.slug) ?? '',
    urlPrefix: null, // each article declares its own slug
    priority: 70,
  },
  {
    type: 'composite-article',
    typeWords: ['composite-article', 'composite article', 'composite'],
    dir: 'composite-articles',
    recursive: true,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id) ?? asString(d.slug),
    buildDisplayName: (d) => asString(d.title),
    buildUrl: (e) => asString(e.data.slug) ?? '',
    urlPrefix: null,
    priority: 75,
  },
  {
    type: 'hex',
    typeWords: ['hex'],
    dir: 'hexes',
    recursive: true,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => {
      const id = asString(d.id);
      return id ? id.toLowerCase() : null;
    },
    buildDisplayName: (d) => {
      const name = asString(d.name);
      if (name && name !== 'unknown') return name;
      const id = asString(d.id);
      return id ? id.toUpperCase() : null;
    },
    buildUrl: (e) => `/session-toolkit/hexes/${e.key}`,
    urlPrefix: '/session-toolkit/hexes/',
    priority: 80,
  },
  {
    type: 'region',
    typeWords: ['region', 'regions'],
    dir: 'regions',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.name),
    buildUrl: (e) => `/session-toolkit/regions/${e.key}`,
    urlPrefix: '/session-toolkit/regions/',
    priority: 90,
  },
  {
    type: 'dungeon',
    typeWords: ['dungeon', 'dungeons'],
    dir: 'dungeons',
    recursive: true,
    extensions: ['.md', '.mdx'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.name) ?? asString(d.title),
    buildUrl: (e) => `/gm-reference/dungeons/${e.key}`,
    urlPrefix: '/gm-reference/dungeons/',
    priority: 100,
  },
  {
    type: 'stat-block',
    typeWords: ['stat-block', 'stat block', 'statblock'],
    dir: 'stat-blocks',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.name),
    buildUrl: (e) => `/gm-reference/stat-blocks/${e.key}`,
    urlPrefix: '/gm-reference/stat-blocks/',
    priority: 110,
  },
  {
    type: 'loot-pack',
    typeWords: ['loot-pack', 'loot pack', 'lootpack'],
    dir: 'loot-packs',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.name),
    buildUrl: (e) => `/session-toolkit/loot-packs/${e.key}`,
    urlPrefix: '/session-toolkit/loot-packs/',
    priority: 120,
  },
  {
    type: 'bounty',
    typeWords: ['bounty', 'bounties'],
    dir: 'bounties',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.title) ?? asString(d.name),
    buildUrl: (e) => `/players-reference/setting/bounty-board/${e.key}`,
    urlPrefix: '/players-reference/setting/bounty-board/',
    priority: 130,
  },
  {
    type: 'roleplay-book',
    typeWords: ['roleplay-book', 'roleplay book'],
    dir: 'roleplay-books',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.name) ?? asString(d.title),
    buildUrl: (e) => `/session-toolkit/roleplay-books/${e.key}`,
    urlPrefix: '/session-toolkit/roleplay-books/',
    priority: 140,
  },
  {
    type: 'rumor',
    typeWords: ['rumor', 'rumors'],
    dir: 'rumors',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.title) ?? asString(d.name),
    buildUrl: (e) => `/session-toolkit/rumors/${e.key}`,
    urlPrefix: '/session-toolkit/rumors/',
    priority: 150,
  },
  {
    type: 'spell',
    typeWords: ['spell', 'spells'],
    dir: 'spells',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.name),
    buildUrl: (e) => `/gm-reference/spells/${e.key}`,
    urlPrefix: '/gm-reference/spells/',
    priority: 160,
  },
  {
    type: 'pointcrawl',
    typeWords: ['pointcrawl', 'pointcrawls'],
    dir: 'pointcrawls',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.slug) ?? asString(d.id),
    buildDisplayName: (d) => asString(d.name) ?? asString(d.title),
    buildUrl: (e) => `/gm-reference/pointcrawls/${e.key}`,
    urlPrefix: '/gm-reference/pointcrawls/',
    priority: 170,
  },
  // Routeless types — referenced but not linkable. The validator flags any
  // reference to these as a bug (route should exist, or prose shouldn't
  // pretend it does).
  {
    type: 'class',
    typeWords: ['class', 'classes'],
    dir: 'classes',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.name),
    buildUrl: null,
    urlPrefix: null,
    priority: 200,
  },
  {
    type: 'noble',
    typeWords: ['noble', 'nobles'],
    dir: 'nobles',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.name),
    buildUrl: null,
    urlPrefix: null,
    priority: 210,
  },
  {
    type: 'political-faction',
    typeWords: ['political-faction', 'political faction'],
    dir: 'political-factions',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.name),
    buildUrl: null,
    urlPrefix: null,
    priority: 220,
  },
  {
    type: 'encounter-category-table',
    typeWords: ['encounter-category-table'],
    dir: 'encounter-category-tables',
    recursive: false,
    extensions: ['.yml', '.yaml'],
    buildKey: (d) => asString(d.id),
    buildDisplayName: (d) => asString(d.name),
    buildUrl: null,
    urlPrefix: null,
    priority: 230,
  },
];

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export interface BuildResolverOptions {
  /** Absolute path to the data/ directory. */
  dataRoot: string;
  /** Optional warning sink (defaults to console.warn). */
  warn?: (msg: string) => void;
}

export function buildResolver(options: BuildResolverOptions): Resolver {
  const { dataRoot, warn = (m) => console.warn(m) } = options;

  // Per-type index: type → key → entity.
  const indexByType = new Map<CollectionType, Map<string, EntityRecord>>();
  // Reverse index for URL lookups: url → entity.
  const indexByUrl = new Map<string, ResolvedRef>();
  // Type-word → canonical type.
  const typeWordMap = new Map<string, CollectionType>();
  // Routeless types as a set.
  const routelessTypes = new Set<CollectionType>();

  // Sorted by priority so disambiguation by-priority is deterministic.
  const sortedCollections = [...COLLECTIONS].sort(
    (a, b) => a.priority - b.priority,
  );

  for (const cfg of sortedCollections) {
    for (const word of cfg.typeWords) {
      typeWordMap.set(word.toLowerCase(), cfg.type);
    }
    if (cfg.buildUrl === null) routelessTypes.add(cfg.type);

    const typeIndex = new Map<string, EntityRecord>();
    indexByType.set(cfg.type, typeIndex);

    if (!cfg.dir) continue;
    const dir = join(dataRoot, cfg.dir);
    if (!existsSync(dir)) continue;

    const files = collectFiles(dir, cfg.extensions, cfg.recursive);
    for (const filePath of files) {
      const data = parseFile(filePath);
      if (!data) continue;
      const key = cfg.buildKey(data, filePath);
      if (!key) continue;

      const entity: EntityRecord = {
        key,
        data,
        type: cfg.type,
        filePath,
      };

      // Index by key.
      if (typeIndex.has(key)) {
        warn(
          `[data-refs] duplicate ${cfg.type} key "${key}" — already at ` +
            `${typeIndex.get(key)?.filePath}, now also at ${filePath}`,
        );
      } else {
        typeIndex.set(key, entity);
      }

      // Index by canonical URL.
      if (cfg.buildUrl) {
        const url = cfg.buildUrl(entity);
        if (url) {
          const ref: ResolvedRef = {
            type: cfg.type,
            entity,
            url,
            displayName:
              cfg.buildDisplayName(data) ?? entity.key.toUpperCase(),
          };
          // First wins on URL collisions; warn so they get fixed.
          if (indexByUrl.has(url)) {
            warn(
              `[data-refs] URL collision: ${url} — ${indexByUrl.get(url)?.entity.filePath} vs ${filePath}`,
            );
          } else {
            indexByUrl.set(url, ref);
          }
        }
      }
    }
  }

  function resolveSlug(
    slug: string,
    typeHint?: string | null,
  ): ResolvedRef | null {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) return null;

    if (typeHint) {
      const canonicalType = typeWordMap.get(typeHint.toLowerCase());
      if (canonicalType) {
        const found = lookupInType(canonicalType, normalizedSlug);
        if (found) return found;
      }
    }

    // No hint, or hint didn't resolve — walk by priority.
    for (const cfg of sortedCollections) {
      const found = lookupInType(cfg.type, normalizedSlug);
      if (found) return found;
    }
    return null;
  }

  function lookupInType(
    type: CollectionType,
    key: string,
  ): ResolvedRef | null {
    const typeIndex = indexByType.get(type);
    if (!typeIndex) return null;
    // Hex lookups are case-insensitive (canonical lowercase).
    const lookupKey = type === 'hex' ? key.toLowerCase() : key;
    const entity = typeIndex.get(lookupKey);
    if (!entity) return null;
    const cfg = COLLECTIONS.find((c) => c.type === type);
    if (!cfg) return null;
    const url = cfg.buildUrl ? cfg.buildUrl(entity) : null;
    const displayName =
      cfg.buildDisplayName(entity.data) ?? entity.key.toUpperCase();
    return { type, entity, url, displayName };
  }

  function resolveUrl(url: string): ResolvedRef | null {
    const normalized = url.split('#')[0]?.split('?')[0] ?? url;
    return indexByUrl.get(normalized) ?? null;
  }

  function detectDrift(url: string): ResolvedRef | null {
    const normalized = url.split('#')[0]?.split('?')[0] ?? url;
    for (const { prefix, type } of DRIFT_PATTERNS) {
      if (normalized.startsWith(prefix)) {
        const slug = normalized.slice(prefix.length);
        if (!slug) continue;
        return lookupInType(type, slug);
      }
    }
    return null;
  }

  function stats(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [type, idx] of indexByType) {
      if (idx.size > 0) result[type] = idx.size;
    }
    return result;
  }

  const canonicalPrefixes = sortedCollections
    .map((c) => c.urlPrefix)
    .filter((p): p is string => p !== null);
  const driftPrefixes = DRIFT_PATTERNS.map((d) => d.prefix);

  return {
    resolveSlug,
    resolveUrl,
    detectDrift,
    isRouteless: (type) => routelessTypes.has(type),
    collectionTypes: () => sortedCollections.map((c) => c.type),
    typeWordIndex: () => typeWordMap,
    stats,
    entitiesOf: (type) => [...(indexByType.get(type)?.values() ?? [])],
    canonicalUrlPrefixes: () => [...canonicalPrefixes],
    driftUrlPrefixes: () => [...driftPrefixes],
  };
}

// ---------------------------------------------------------------------------
// Backtick scanner
// ---------------------------------------------------------------------------

export interface BacktickRef {
  /** The slug inside the backticks. */
  slug: string;
  /** Type word that immediately precedes the backticks ("encounter", "faction"), if any. */
  typeHint: string | null;
  /** Character offset where the opening backtick is in `text`. */
  start: number;
  /** Character offset just past the closing backtick. */
  end: number;
  /** Line number (1-indexed) for diagnostics. */
  line: number;
  /** The full matched substring including backticks. */
  raw: string;
  /** True if the backtick is inside a markdown link's text portion `[ … ]`. */
  insideLinkText: boolean;
}

const TYPE_WORD_PATTERN = /([A-Za-z][A-Za-z-]*)\s*$/;

/**
 * Find all single-backtick `slug` tokens in `text` outside fenced code blocks
 * and outside markdown link URLs. Slugs that *are* inside markdown link text
 * are still surfaced (with `insideLinkText: true`) so the validator can flag
 * them — they're typically a bug — but the linker skips them.
 *
 * Markdown frontmatter (--- … ---) at the very start of `text` is *not*
 * stripped here. Callers pass body-only text for `.md` files.
 */
export function findBacktickRefs(
  text: string,
  resolver: Resolver,
): BacktickRef[] {
  const refs: BacktickRef[] = [];
  const lines = text.split(/\r?\n/);

  let inFence = false;
  let fenceMarker = '';
  let offset = 0;

  // Capture single-backtick tokens. Slugs may include letters, digits, hyphens,
  // slashes (for article ids like `first-civ/loveda`), and underscores. Reject
  // tokens with whitespace inside.
  const backtickRe = /`([^`\n]+)`/g;
  // Markdown link reference: [ ... ]( ... )
  // To detect "inside link text" we test each match against any [ ... ] span
  // that wraps it on the same line.

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const lineStart = offset;

    // Fence tracking. Treat `~~~` and triple-backticks symmetrically.
    const fenceMatch = /^(\s*)(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[2];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker[0]!;
      } else if (marker.startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = '';
      }
      offset += line.length + 1;
      continue;
    }
    if (inFence) {
      offset += line.length + 1;
      continue;
    }

    // Find link spans on this line so we can flag refs inside link text.
    const linkSpans: Array<{ start: number; end: number }> = [];
    const linkRe = /\[((?:[^[\]]|\\\[|\\\])*)\]\(([^)]*)\)/g;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkRe.exec(line)) !== null) {
      // Text inside `[ ... ]` of the link
      const textStart = linkMatch.index + 1;
      const textEnd = textStart + (linkMatch[1]?.length ?? 0);
      linkSpans.push({ start: textStart, end: textEnd });
    }

    backtickRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = backtickRe.exec(line)) !== null) {
      const slug = (m[1] ?? '').trim();
      if (!slug) continue;
      if (!isPlausibleSlug(slug)) continue;

      const matchStart = m.index;
      const matchEnd = m.index + m[0].length;
      const insideLinkText = linkSpans.some(
        (s) => matchStart >= s.start && matchEnd <= s.end,
      );

      // Type-word hint: a word immediately preceding the opening backtick.
      const precedingText = line.slice(0, matchStart);
      const hintMatch = TYPE_WORD_PATTERN.exec(precedingText);
      const candidateHint = hintMatch?.[1]?.toLowerCase() ?? null;
      const typeHint =
        candidateHint && resolver.typeWordIndex().has(candidateHint)
          ? candidateHint
          : null;

      refs.push({
        slug,
        typeHint,
        start: lineStart + matchStart,
        end: lineStart + matchEnd,
        line: i + 1,
        raw: m[0],
        insideLinkText,
      });
    }

    offset += line.length + 1;
  }

  return refs;
}

/** Markdown links: `[text](url)`. Returns matches in document order. */
export interface MarkdownLink {
  text: string;
  url: string;
  start: number;
  end: number;
  line: number;
}

export function findMarkdownLinks(text: string): MarkdownLink[] {
  const result: MarkdownLink[] = [];
  const lines = text.split(/\r?\n/);

  let inFence = false;
  let fenceMarker = '';
  let offset = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const lineStart = offset;

    const fenceMatch = /^(\s*)(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[2];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker[0]!;
      } else if (marker.startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = '';
      }
      offset += line.length + 1;
      continue;
    }
    if (inFence) {
      offset += line.length + 1;
      continue;
    }

    const linkRe = /\[((?:[^[\]]|\\\[|\\\])*)\]\(([^)]*)\)/g;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(line)) !== null) {
      result.push({
        text: m[1] ?? '',
        url: m[2] ?? '',
        start: lineStart + m.index,
        end: lineStart + m.index + m[0].length,
        line: i + 1,
      });
    }

    offset += line.length + 1;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Frontmatter / file parsing
// ---------------------------------------------------------------------------

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown> | null;
  body: string;
  /** Character offset where `body` starts in the original raw text. */
  bodyOffset: number;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

export function parseMarkdownFile(filePath: string): ParsedMarkdown | null {
  const raw = readFileSync(filePath, 'utf-8');
  const m = FRONTMATTER_RE.exec(raw);
  if (m) {
    try {
      const frontmatter = yaml.parse(m[1] ?? '') as Record<string, unknown>;
      return {
        frontmatter,
        body: raw.slice(m[0].length),
        bodyOffset: m[0].length,
      };
    } catch {
      return { frontmatter: null, body: raw, bodyOffset: 0 };
    }
  }
  return { frontmatter: null, body: raw, bodyOffset: 0 };
}

/** Parse a YAML or markdown+frontmatter file into a flat data record. */
function parseFile(filePath: string): Record<string, unknown> | null {
  const ext = extname(filePath).toLowerCase();
  try {
    if (ext === '.md' || ext === '.mdx') {
      const parsed = parseMarkdownFile(filePath);
      return parsed?.frontmatter ?? null;
    }
    if (ext === '.yml' || ext === '.yaml') {
      const raw = readFileSync(filePath, 'utf-8');
      return yaml.parse(raw) as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function collectFiles(
  dir: string,
  extensions: readonly string[],
  recursive: boolean,
): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (recursive) walk(full);
        continue;
      }
      const ext = extname(entry).toLowerCase();
      if (extensions.includes(ext)) out.push(full);
    }
  };
  walk(dir);
  return out;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return null;
}

function isPlotlineFrontmatter(d: Record<string, unknown>): boolean {
  // Plotline files have `slug` + `title` and *no* `plotline` field
  // (the `plotline` field is what marks a beat).
  return (
    typeof d.slug === 'string' &&
    typeof d.title === 'string' &&
    d.plotline === undefined
  );
}

function isBeatFrontmatter(d: Record<string, unknown>): boolean {
  // Beats have `plotline:` pointing to a parent plotline slug, plus their own `slug`.
  return typeof d.slug === 'string' && typeof d.plotline === 'string';
}

/** Plausible slug pattern. Permissive but excludes obvious code (spaces, JS syntax, etc.). */
function isPlausibleSlug(s: string): boolean {
  if (s.length > 80) return false;
  // Must contain at least one alphanumeric character.
  if (!/[a-z0-9]/i.test(s)) return false;
  // Disallow JS-ish characters that wouldn't appear in our slugs.
  if (/[(){}=;<>"!?@$&|*+,]/.test(s)) return false;
  // Disallow brackets — `[brackets]`-style references are documentation, not slugs.
  if (/[[\]]/.test(s)) return false;
  // Disallow whitespace.
  if (/\s/.test(s)) return false;
  // Disallow file paths and filenames with extensions.
  if (s.startsWith('/')) return false;
  if (/\.[a-z0-9]+$/i.test(s)) return false;
  // Must start with alphanumeric (no leading hyphen/slash/etc).
  if (!/^[a-z0-9]/i.test(s)) return false;
  return true;
}
