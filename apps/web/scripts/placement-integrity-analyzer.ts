/**
 * Pure analysis core for the clue/beat placement-integrity validator.
 *
 * `validate-placement-integrity.ts` handles I/O (globbing files, parsing YAML /
 * frontmatter) and exit codes; this module is pure so the surface-walking and
 * the six invariant checks can be exercised directly from unit tests.
 *
 * See the script header for the division of labour with `validate-hex-beat-refs.ts`
 * (anchor arrays) and `validate-clue-placements.ts` (placement counts).
 */

// --- Types ----------------------------------------------------------------

/** A parsed data file: its path (relative to the data root) and object body. */
export interface ParsedFile {
  file: string;
  data: Record<string, unknown>;
}

export interface AnalysisInput {
  clues: ParsedFile[];
  /** Beat frontmatter; `file` is the on-disk path (…/plotlines/<pl>/beats/<slug>.md). */
  beats: ParsedFile[];
  hexes: ParsedFile[];
  encounters: ParsedFile[];
  dungeons: ParsedFile[];
  npcs: ParsedFile[];
  characters: ParsedFile[];
  pointcrawlNodes: ParsedFile[];
  roleplayBooks: ParsedFile[];
}

export type FindingKind =
  | 'dangling-clue'
  | 'dangling-beat-link'
  | 'back-link'
  | 'double-home'
  | 'duplicate-id'
  | 'id-mismatch';

export interface PlacementFinding {
  kind: FindingKind;
  /** Path(s) the finding anchors to, for the report. */
  file: string;
  detail: string;
}

/** Top-level keys that must never appear on a *content* file — placement is
 * owned by the location, so a `hexes`/`placements`/… array on a clue or beat is
 * always a back-link bug. */
export const FORBIDDEN_PLACEMENT_KEYS = [
  'hexes',
  'placements',
  'locations',
  'placedAt',
  'hexIds',
] as const;

// --- Helpers --------------------------------------------------------------

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

/** Filename without directory or data extension. */
export function fileStem(file: string): string {
  const base = toPosix(file).split('/').pop() ?? file;
  return base.replace(/\.(ya?ml|mdx?)$/, '');
}

/** Parent plotline slug for a beat file path (…/<plotline>/beats/<slug>.md). */
function beatPathPlotline(file: string): string {
  const parts = toPosix(file).split('/');
  const beatsIdx = parts.lastIndexOf('beats');
  return beatsIdx >= 1 ? parts[beatsIdx - 1] : '';
}

/** A clue reference is either a bare id string or `{ id, context? }`. */
export function clueRefId(ref: unknown): string | null {
  if (typeof ref === 'string') return ref;
  if (ref && typeof ref === 'object' && typeof (ref as { id?: unknown }).id === 'string') {
    return (ref as { id: string }).id;
  }
  return null;
}

export function clueRefIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(clueRefId).filter((id): id is string => id !== null);
}

interface LinkRow {
  linkType?: unknown;
  linkId?: unknown;
}

/** All tidings rows (rolled + situational) of a roleplay book. */
function tidingsRows(bookData: Record<string, unknown>): LinkRow[] {
  const reports = (bookData.intelligenceReports ?? {}) as Record<string, unknown>;
  return [
    ...(Array.isArray(reports.rows) ? (reports.rows as LinkRow[]) : []),
    ...(Array.isArray(reports.situational) ? (reports.situational as LinkRow[]) : []),
  ];
}

// --- Analysis -------------------------------------------------------------

export function analyzePlacementIntegrity(input: AnalysisInput): PlacementFinding[] {
  const findings: PlacementFinding[] = [];

  // ---- definitions: clue ids (+ duplicates, mismatches, back-links) -------
  const clueIds = new Set<string>();
  for (const { file, data } of input.clues) {
    const stem = fileStem(file);
    const id = (typeof data.id === 'string' ? data.id : undefined) ?? stem;
    if (clueIds.has(id)) {
      findings.push({ kind: 'duplicate-id', file, detail: `clue id "${id}" already defined` });
    }
    clueIds.add(id);
    if (typeof data.id === 'string' && data.id !== stem) {
      findings.push({
        kind: 'id-mismatch',
        file,
        detail: `id "${data.id}" ≠ filename "${stem}"`,
      });
    }
    for (const key of FORBIDDEN_PLACEMENT_KEYS) {
      if (key in data) {
        findings.push({ kind: 'back-link', file, detail: `clue file carries placement key "${key}"` });
      }
    }
  }

  // ---- definitions: beat canonical ids (+ duplicates, mismatches, back-links)
  const beatIds = new Set<string>();
  for (const { file, data } of input.beats) {
    const slug = typeof data.slug === 'string' ? data.slug : undefined;
    const plotline = typeof data.plotline === 'string' ? data.plotline : undefined;
    const pathSlug = fileStem(file);
    const pathPlotline = beatPathPlotline(file);
    if (slug && plotline) {
      const canonical = `${plotline}/${slug}`;
      if (beatIds.has(canonical)) {
        findings.push({ kind: 'duplicate-id', file, detail: `beat id "${canonical}" already defined` });
      }
      beatIds.add(canonical);
    }
    if ((slug && slug !== pathSlug) || (plotline && plotline !== pathPlotline)) {
      findings.push({
        kind: 'id-mismatch',
        file,
        detail: `frontmatter "${plotline ?? '?'}/${slug ?? '?'}" ≠ path "${pathPlotline}/${pathSlug}"`,
      });
    }
    for (const key of FORBIDDEN_PLACEMENT_KEYS) {
      if (key in data) {
        findings.push({ kind: 'back-link', file, detail: `beat file carries placement key "${key}"` });
      }
    }
  }

  // ---- reference walk -----------------------------------------------------
  const beatAnchors = new Map<string, string[]>(); // beatId -> anchoring files
  const beatTidings = new Map<string, string[]>(); // beatId -> tidings files

  const refClue = (id: string | null, file: string, surface: string): void => {
    if (id === null) return;
    if (!clueIds.has(id)) {
      findings.push({ kind: 'dangling-clue', file, detail: `${surface} → clue "${id}" not found` });
    }
  };
  const noteAnchor = (map: Map<string, string[]>, beatId: string, file: string): void => {
    const arr = map.get(beatId) ?? [];
    arr.push(file);
    map.set(beatId, arr);
  };
  const refBeatLink = (id: string, file: string, surface: string): void => {
    if (!beatIds.has(id)) {
      findings.push({ kind: 'dangling-beat-link', file, detail: `${surface} → beat "${id}" not found` });
    }
  };

  // hexes: landmark + hidden sites + dream notes
  for (const { file, data } of input.hexes) {
    const feature = (feat: unknown, label: string): void => {
      if (!feat || typeof feat !== 'object') return;
      const f = feat as Record<string, unknown>;
      for (const id of clueRefIds(f.clues)) refClue(id, file, `${label}.clues`);
      // anchor arrays are validated by validate-hex-beat-refs; read only for double-home
      if (Array.isArray(f.beats)) {
        for (const b of f.beats) if (typeof b === 'string') noteAnchor(beatAnchors, b, file);
      }
      if (typeof f.linkId === 'string') {
        if (f.linkType === 'clue') refClue(f.linkId, file, `${label}.linkId`);
        if (f.linkType === 'beat') {
          noteAnchor(beatAnchors, f.linkId, file);
          refBeatLink(f.linkId, file, `${label}.linkId`);
        }
      }
      // clueId: the clue that revealed a clue-sourced site (integrity, not placement)
      if (typeof f.clueId === 'string') refClue(f.clueId, file, `${label}.clueId`);
    };

    feature(data.landmark, 'landmark');
    if (Array.isArray(data.hiddenSites)) {
      data.hiddenSites.forEach((site, i) => feature(site, `hiddenSites[${i}]`));
    }
    if (Array.isArray(data.notes)) {
      data.notes.forEach((note, i) => {
        if (note && typeof note === 'object' && typeof (note as { clueId?: unknown }).clueId === 'string') {
          refClue((note as { clueId: string }).clueId, file, `notes[${i}].clueId`);
        }
      });
    }
  }

  // simple clue-carriers
  const carriers: Array<[ParsedFile[], string]> = [
    [input.encounters, 'encounter.clues'],
    [input.dungeons, 'dungeon.clues'],
    [input.npcs, 'npc.clues'],
    [input.characters, 'character.clues'],
    [input.pointcrawlNodes, 'pointcrawl-node.clues'],
    [input.beats, 'beat.clues'],
  ];
  for (const [collection, surface] of carriers) {
    for (const { file, data } of collection) {
      for (const id of clueRefIds(data.clues)) refClue(id, file, surface);
    }
  }

  // clue.linkedClues integrity
  for (const { file, data } of input.clues) {
    if (Array.isArray(data.linkedClues)) {
      for (const id of data.linkedClues) if (typeof id === 'string') refClue(id, file, 'clue.linkedClues');
    }
  }

  // roleplay-book tidings → clue/beat links (+ collect tidings for double-home)
  for (const { file, data } of input.roleplayBooks) {
    for (const row of tidingsRows(data)) {
      if (typeof row.linkId !== 'string') continue;
      if (row.linkType === 'clue') refClue(row.linkId, file, 'roleplay-book.tidings.linkId');
      if (row.linkType === 'beat') {
        noteAnchor(beatTidings, row.linkId, file);
        refBeatLink(row.linkId, file, 'roleplay-book.tidings.linkId');
      }
    }
  }

  // ---- double-home --------------------------------------------------------
  for (const [beatId, anchorFiles] of beatAnchors) {
    const tidingFiles = beatTidings.get(beatId);
    if (tidingFiles) {
      findings.push({
        kind: 'double-home',
        file: anchorFiles.join(', '),
        detail: `beat "${beatId}" is hex-anchored AND in tidings (${tidingFiles.join(', ')})`,
      });
    }
  }

  return findings;
}

// --- Reporting ------------------------------------------------------------

const SECTIONS: Array<{ kind: FindingKind; title: string }> = [
  { kind: 'dangling-clue', title: 'Dangling clue references' },
  { kind: 'dangling-beat-link', title: 'Dangling beat linkId references' },
  { kind: 'back-link', title: 'Forbidden placement back-links on content files' },
  { kind: 'double-home', title: 'Double-home beats (hex-anchored AND in tidings)' },
  { kind: 'duplicate-id', title: 'Duplicate ids' },
  { kind: 'id-mismatch', title: 'Id / slug mismatches' },
];

export function formatReport(findings: PlacementFinding[]): string {
  if (findings.length === 0) {
    return 'All placement references resolve; no back-links, double-homes, or id collisions.\n';
  }
  const sections: string[] = [];
  for (const { kind, title } of SECTIONS) {
    const group = findings.filter((f) => f.kind === kind);
    if (group.length === 0) continue;
    const lines = [`✖ ${group.length} — ${title}:`];
    for (const f of group) lines.push(`  ${f.file}  ${f.detail}`);
    sections.push(lines.join('\n'));
  }
  return sections.join('\n\n') + '\n';
}
