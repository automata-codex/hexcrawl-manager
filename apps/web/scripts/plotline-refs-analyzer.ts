/**
 * Pure analysis core for the plotline back-reference validator.
 *
 * `validate-plotline-refs.ts` handles I/O and exit codes; this module is
 * pure so it can be exercised directly from unit tests.
 */

import { remark } from 'remark';
import remarkGfm from 'remark-gfm';

// --- Types ----------------------------------------------------------------

export interface PlotlineFile {
  slug: string;
  title: string;
  body: string;
  /** Ordered bare slugs of beats this plotline references. */
  beats?: string[];
}

/**
 * A beat file discovered on disk. Slugs come from the directory layout
 * (`<plotlines-dir>/<parentPlotlineSlug>/beats/<slug>.{md,mdx}`); the
 * frontmatter `plotline` field is captured so we can flag mismatches
 * between the redundant frontmatter and the path-derived parent.
 */
export interface BeatFile {
  slug: string;
  parentPlotlineSlug: string;
  plotlineFrontmatter: string | null;
}

export interface NpcEntity {
  id: string;
  displayName: string;
  plotlines?: string[];
}

export interface FactionEntity {
  id: string;
  name: string;
  plotlines?: string[];
}

export interface CharacterEntity {
  id: string;
  displayName: string;
  plotlines?: string[];
}

export type EntityKind = 'npc' | 'faction' | 'character' | 'beat';

export type WarningKind =
  | 'missing-back-ref'
  | 'stale-back-ref'
  | 'unresolved-body-mention'
  | 'missing-beat-file'
  | 'orphan-beat'
  | 'beat-plotline-mismatch';

export interface RefWarning {
  plotlineSlug: string;
  plotlineTitle: string;
  kind: WarningKind;
  entityKind: EntityKind;
  /** Resolved entity id when known; the raw body-name string when unresolved. */
  entityIdOrName: string;
  /** Display label (entity name, or the raw body string when unresolved). */
  entityLabel: string;
}

export interface AnalysisInput {
  plotlines: PlotlineFile[];
  npcs: NpcEntity[];
  factions: FactionEntity[];
  characters: CharacterEntity[];
  /** All beat files discovered under any plotline's `beats/` subdirectory. */
  beats?: BeatFile[];
}

// --- Minimal mdast shape (avoids depending on @types/mdast) ---------------

type MdNode = { type: string; children?: MdNode[]; value?: string };
type MdHeading = MdNode & { type: 'heading'; depth: number; children: MdNode[] };
type MdList = MdNode & { type: 'list'; children: MdNode[] };
type MdListItem = MdNode & { type: 'listItem'; children: MdNode[] };
type MdLink = MdNode & { type: 'link'; url: string; children: MdNode[] };

function isHeading(n: MdNode): n is MdHeading {
  return n.type === 'heading';
}
function isList(n: MdNode): n is MdList {
  return n.type === 'list';
}
function isListItem(n: MdNode): n is MdListItem {
  return n.type === 'listItem';
}

function nodeToText(node: MdNode): string {
  if (node.value !== undefined) return node.value;
  if (!node.children) return '';
  return node.children.map(nodeToText).join('');
}

function collectLinks(node: MdNode, out: MdLink[] = []): MdLink[] {
  if (node.type === 'link') out.push(node as MdLink);
  if (node.children) node.children.forEach((c) => collectLinks(c, out));
  return out;
}

// --- Body parsing ---------------------------------------------------------

// Word-boundary (not `^`) so prefixed headings like "Other NPCs" still
// classify as an NPC section.
const NPC_H2_RE = /\b(npcs|operatives|agents)\b/i;
const FACTION_H2_RE = /^factions\b/i;
const CHARACTER_H2_RE = /^characters\b/i;

type SectionKind = EntityKind | null;

function classifyH2(text: string): SectionKind {
  if (NPC_H2_RE.test(text)) return 'npc';
  if (FACTION_H2_RE.test(text)) return 'faction';
  if (CHARACTER_H2_RE.test(text)) return 'character';
  return null;
}

export interface BodyMentions {
  npcNames: string[];
  factionNames: string[];
  characterNames: string[];
  npcIds: string[];
  factionIds: string[];
  characterIds: string[];
}

/** Extract a candidate entity label from a raw list-item or heading string. */
export function extractCandidateLabel(raw: string): string {
  let s = raw;
  // Strip leading bold wrapper if it brackets the first segment.
  s = s.replace(/^\*\*([^*]+)\*\*/, '$1');
  // Drop parenthetical asides.
  s = s.replace(/\s*\(.*?\)\s*/g, ' ');
  // Take everything before the first em-dash or hyphen-with-spaces.
  s = s.split(/—|\s-\s/, 1)[0] ?? s;
  return s.trim();
}

const ID_FROM_URL_RES: Record<EntityKind, RegExp[]> = {
  npc: [/\/npcs\/([a-z0-9-]+)\b/i],
  faction: [/\/factions\/([a-z0-9-]+)\b/i],
  character: [/\/characters\/([a-z0-9-]+)\b/i],
  // Beats aren't body-scanned for mentions; entry exists only to satisfy
  // the exhaustive Record type.
  beat: [],
};

function idFromUrl(kind: EntityKind, url: string): string | null {
  for (const re of ID_FROM_URL_RES[kind]) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function parseBodyMentions(body: string): BodyMentions {
  const tree = remark().use(remarkGfm).parse(body) as MdNode;
  const out: BodyMentions = {
    npcNames: [],
    factionNames: [],
    characterNames: [],
    npcIds: [],
    factionIds: [],
    characterIds: [],
  };
  if (!tree.children) return out;

  let currentSection: SectionKind = null;
  // Once we've seen an H3 inside a classified section, subsequent top-level
  // bullets are detail content (e.g. "Mission: …" under "### Mara Tindle"),
  // not entity-name candidates. Reset on the next H2.
  let insideSubsection = false;

  const pushName = (kind: EntityKind, name: string): void => {
    if (!name) return;
    if (kind === 'npc') out.npcNames.push(name);
    else if (kind === 'faction') out.factionNames.push(name);
    else out.characterNames.push(name);
  };
  const pushId = (kind: EntityKind, id: string): void => {
    if (kind === 'npc') out.npcIds.push(id);
    else if (kind === 'faction') out.factionIds.push(id);
    else out.characterIds.push(id);
  };

  for (const node of tree.children) {
    if (isHeading(node)) {
      if (node.depth === 2) {
        currentSection = classifyH2(nodeToText(node));
        insideSubsection = false;
        continue;
      }
      if (node.depth === 3 && currentSection !== null) {
        let foundDirectId = false;
        for (const link of collectLinks(node)) {
          const id = idFromUrl(currentSection, link.url);
          if (id) {
            pushId(currentSection, id);
            foundDirectId = true;
          }
        }
        if (!foundDirectId) {
          pushName(currentSection, extractCandidateLabel(nodeToText(node)));
        }
        insideSubsection = true;
        continue;
      }
      continue;
    }
    if (currentSection === null) continue;
    if (insideSubsection) continue;
    if (isList(node)) {
      for (const item of node.children) {
        if (!isListItem(item)) continue;
        let foundDirectId = false;
        for (const link of collectLinks(item)) {
          const id = idFromUrl(currentSection, link.url);
          if (id) {
            pushId(currentSection, id);
            foundDirectId = true;
          }
        }
        // Only push a name candidate when no direct id was extracted —
        // otherwise the link text becomes a false unresolved-mention.
        if (!foundDirectId) {
          pushName(currentSection, extractCandidateLabel(nodeToText(item)));
        }
      }
    }
  }
  return out;
}

// --- Analysis -------------------------------------------------------------

export function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

interface ResolveResult {
  resolvedIds: Set<string>;
  unresolvedNames: string[];
}

function resolveOne(
  rawIds: string[],
  rawNames: string[],
  byId: Map<string, unknown>,
  byName: Map<string, string>,
): ResolveResult {
  const resolved = new Set<string>();
  const unresolved: string[] = [];
  for (const id of rawIds) {
    if (byId.has(id)) resolved.add(id);
    else unresolved.push(id);
  }
  for (const name of rawNames) {
    if (!name) continue;
    const id = byName.get(normalizeName(name));
    if (id) resolved.add(id);
    else unresolved.push(name);
  }
  return { resolvedIds: resolved, unresolvedNames: unresolved };
}

export function analyzePlotlineRefs(input: AnalysisInput): RefWarning[] {
  const npcsByName = new Map(input.npcs.map((n) => [normalizeName(n.displayName), n.id]));
  const npcsById = new Map(input.npcs.map((n) => [n.id, n]));
  const factionsByName = new Map(
    input.factions.map((f) => [normalizeName(f.name), f.id]),
  );
  const factionsById = new Map(input.factions.map((f) => [f.id, f]));
  const charactersByName = new Map(
    input.characters.map((c) => [normalizeName(c.displayName), c.id]),
  );
  const charactersById = new Map(input.characters.map((c) => [c.id, c]));

  const npcPlotlines = new Map(
    input.npcs.map((n) => [n.id, new Set(n.plotlines ?? [])]),
  );
  const factionPlotlines = new Map(
    input.factions.map((f) => [f.id, new Set(f.plotlines ?? [])]),
  );
  const characterPlotlines = new Map(
    input.characters.map((c) => [c.id, new Set(c.plotlines ?? [])]),
  );

  const warnings: RefWarning[] = [];

  for (const plotline of input.plotlines) {
    const mentions = parseBodyMentions(plotline.body);

    const npcRes = resolveOne(mentions.npcIds, mentions.npcNames, npcsById, npcsByName);
    const factionRes = resolveOne(
      mentions.factionIds,
      mentions.factionNames,
      factionsById,
      factionsByName,
    );
    const characterRes = resolveOne(
      mentions.characterIds,
      mentions.characterNames,
      charactersById,
      charactersByName,
    );

    const push = (
      kind: WarningKind,
      entityKind: EntityKind,
      idOrName: string,
      label: string,
    ): void => {
      warnings.push({
        plotlineSlug: plotline.slug,
        plotlineTitle: plotline.title,
        kind,
        entityKind,
        entityIdOrName: idOrName,
        entityLabel: label,
      });
    };

    const compare = (
      entityKind: EntityKind,
      res: ResolveResult,
      backRefMap: Map<string, Set<string>>,
      idToLabel: (id: string) => string,
    ): void => {
      for (const id of res.resolvedIds) {
        const set = backRefMap.get(id);
        if (!set || !set.has(plotline.slug)) {
          push('missing-back-ref', entityKind, id, idToLabel(id));
        }
      }
      for (const [id, set] of backRefMap) {
        if (set.has(plotline.slug) && !res.resolvedIds.has(id)) {
          push('stale-back-ref', entityKind, id, idToLabel(id));
        }
      }
      for (const name of res.unresolvedNames) {
        push('unresolved-body-mention', entityKind, name, name);
      }
    };

    compare('npc', npcRes, npcPlotlines, (id) => npcsById.get(id)?.displayName ?? id);
    compare(
      'faction',
      factionRes,
      factionPlotlines,
      (id) => factionsById.get(id)?.name ?? id,
    );
    compare(
      'character',
      characterRes,
      characterPlotlines,
      (id) => charactersById.get(id)?.displayName ?? id,
    );
  }

  // Beat ↔ plotline sync. Both directions of the bidirectional reference
  // are checked, plus the redundant frontmatter `plotline` field.
  const beats = input.beats ?? [];
  const beatsByPlotline = new Map<string, Set<string>>();
  for (const beat of beats) {
    let set = beatsByPlotline.get(beat.parentPlotlineSlug);
    if (!set) {
      set = new Set();
      beatsByPlotline.set(beat.parentPlotlineSlug, set);
    }
    set.add(beat.slug);
  }

  for (const plotline of input.plotlines) {
    const onDisk = beatsByPlotline.get(plotline.slug) ?? new Set<string>();
    const referenced = new Set(plotline.beats ?? []);

    for (const slug of referenced) {
      if (!onDisk.has(slug)) {
        warnings.push({
          plotlineSlug: plotline.slug,
          plotlineTitle: plotline.title,
          kind: 'missing-beat-file',
          entityKind: 'beat',
          entityIdOrName: slug,
          entityLabel: slug,
        });
      }
    }
    for (const slug of onDisk) {
      if (!referenced.has(slug)) {
        warnings.push({
          plotlineSlug: plotline.slug,
          plotlineTitle: plotline.title,
          kind: 'orphan-beat',
          entityKind: 'beat',
          entityIdOrName: slug,
          entityLabel: slug,
        });
      }
    }
  }

  for (const beat of beats) {
    if (beat.plotlineFrontmatter === null) continue;
    if (beat.plotlineFrontmatter === beat.parentPlotlineSlug) continue;
    warnings.push({
      plotlineSlug: beat.parentPlotlineSlug,
      plotlineTitle: beat.parentPlotlineSlug,
      kind: 'beat-plotline-mismatch',
      entityKind: 'beat',
      entityIdOrName: beat.slug,
      entityLabel: `${beat.slug} (frontmatter plotline=${beat.plotlineFrontmatter})`,
    });
  }

  return warnings;
}

// --- Reporting ------------------------------------------------------------

export function formatReport(warnings: RefWarning[]): string {
  if (warnings.length === 0) return 'All plotline back-references are in sync.\n';

  const byPlotline = new Map<string, RefWarning[]>();
  for (const w of warnings) {
    const key = `${w.plotlineTitle} (${w.plotlineSlug})`;
    if (!byPlotline.has(key)) byPlotline.set(key, []);
    byPlotline.get(key)!.push(w);
  }

  const sections: string[] = [];
  for (const [plotline, group] of byPlotline) {
    const missing = group.filter((w) => w.kind === 'missing-back-ref');
    const stale = group.filter((w) => w.kind === 'stale-back-ref');
    const unresolved = group.filter((w) => w.kind === 'unresolved-body-mention');
    const missingBeats = group.filter((w) => w.kind === 'missing-beat-file');
    const orphanBeats = group.filter((w) => w.kind === 'orphan-beat');
    const mismatchedBeats = group.filter((w) => w.kind === 'beat-plotline-mismatch');

    const lines: string[] = [`Plotline: ${plotline}`];
    if (missing.length > 0) {
      lines.push('  Missing back-references (entity files need updating):');
      for (const w of missing) {
        lines.push(`    - ${w.entityKind}/${w.entityIdOrName}  (${w.entityLabel})`);
      }
    }
    if (stale.length > 0) {
      lines.push('  Stale back-references (entity files list this plotline, but body does not):');
      for (const w of stale) {
        lines.push(`    - ${w.entityKind}/${w.entityIdOrName}  (${w.entityLabel})`);
      }
    }
    if (unresolved.length > 0) {
      lines.push('  Unresolved body mentions (typo or missing entity?):');
      for (const w of unresolved) {
        lines.push(`    - ${w.entityKind}: "${w.entityLabel}"`);
      }
    }
    if (missingBeats.length > 0) {
      lines.push('  Missing beat files (plotline `beats` lists a slug with no matching beat under this plotline):');
      for (const w of missingBeats) {
        lines.push(`    - beat/${w.entityIdOrName}`);
      }
    }
    if (orphanBeats.length > 0) {
      lines.push('  Orphan beats (beat file exists but is not listed in this plotline\'s `beats` array):');
      for (const w of orphanBeats) {
        lines.push(`    - beat/${w.entityIdOrName}`);
      }
    }
    if (mismatchedBeats.length > 0) {
      lines.push('  Beat ↔ plotline mismatches (frontmatter `plotline` field disagrees with parent directory):');
      for (const w of mismatchedBeats) {
        lines.push(`    - ${w.entityLabel}`);
      }
    }
    sections.push(lines.join('\n'));
  }
  return sections.join('\n\n') + '\n';
}
