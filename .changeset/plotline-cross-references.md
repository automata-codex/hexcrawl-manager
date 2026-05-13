---
'@achm/schemas': minor
'@achm/core': minor
'@achm/web': minor
---

Plotline cross-reference standardization. Splits the plotline ↔ NPC /
faction / character / clue relationships into a coherent set of fields:
the plotline body remains the source of truth for "who's in this
plotline," entity files declare which plotlines they appear in for the
reverse direction, beats become structured, and a new build-time
validator cross-checks the two directions for drift. Implements
`docs/specs/plotline-cross-references-spec.md`.

**Schema** (`@achm/schemas`):

- **New** `PlotlineBeatSchema` and `PlotlineBeatStatusEnum` (`'pending' |
  'active' | 'resolved' | 'skipped'`) with optional `trigger`,
  `factions`, `npcs`, `clues`, and `notes` fields. Added as a new
  optional `beats: PlotlineBeatSchema[]` on `PlotlineSchema`. Array
  order handles intra-plotline sequencing; there is no structured
  dependency field — the `trigger` field captures conditional flavor.

- **New** optional `plotlines: string[]` field on `FactionSchema` and
  `CharacterSchema`, mirroring the existing `npc.plotlines` field. These
  fields power reverse-direction rendering on the entity pages and feed
  the new validator; the plotline detail page does *not* derive its
  NPC/faction/character lists from them.

- **Removed** the unused `clues` field from `PlotlineSchema`. Plotline
  ↔ clue links are authoritative on the clue side (`clue.plotlines`),
  which the plotline detail page already uses to render its linked
  clues. No data files used the removed field.

**Core** (`@achm/core`):

- **New** `resolveBeats(beats, lookups)` plus `ResolvedBeat`,
  `ResolvedRef`, `ResolvedClueRef`, and `BeatLookups` types. Pure
  resolver that takes a beats array plus lookup maps for NPCs /
  factions / clues and returns a per-beat structure with each
  reference resolved to `{ id, name, found }` (or
  `{ id, name, found, clueStatus }` for clues). Unknown ids surface as
  `found: false` so callers can render a fallback rather than a broken
  link.

**Web** (`@achm/web`):

- **New** `PlotlineBeats.astro` component renders the `beats` section
  on plotline detail pages: heading + status badge per beat, optional
  trigger line, faction/NPC/clue links (reusing the existing
  linked-clue "known" checkmark treatment), notes rendered as markdown.
  Skipped beats render with reduced visual prominence (muted + line-
  through) but are still shown. Unresolved references render as bare
  id text plus a `(not found)` indicator.

- **Plotline detail page** (`/gm-reference/plotlines/[id].astro`) loads
  NPC / faction / clue collections, builds lookup maps, calls
  `resolveBeats`, and drops in `<PlotlineBeats>`. The existing
  clue-back-reference list (driven by `clue.plotlines`) is unchanged.

- **New** prebuild validator (`scripts/validate-plotline-refs.ts`)
  cross-checks the entities mentioned in each plotline's body against
  the entities whose own files declare this plotline via `plotlines:`,
  flagging three drift categories per plotline: missing back-references
  (entity in body, not in entity file), stale back-references (entity
  file lists this plotline, body doesn't), and unresolved body
  mentions (a name in the body matches no entity file). Heading
  classification is forgiving — "Operatives at Fort Dagaric" still
  matches the NPC heuristic. Warnings-only by default; set
  `ACHM_STRICT_PLOTLINE_REFS=1` to fail the build. Wired into
  `prebuild.sh`; also runnable as `npm run validate:plotlines`.

- **Pure analysis core** (`scripts/plotline-refs-analyzer.ts`) split
  out of the CLI entrypoint for unit-testability. Vitest infrastructure
  added to `apps/web` for the first time
  (`apps/web/vitest.config.ts` + a `test` script in `package.json`);
  picks up `scripts/**/*.spec.ts`.

- **Cleanup:** `clue-usage-tracker.ts` no longer scans
  `plotline.data.clues` (the field is gone); the `plotlines` parameter
  is retained for call-site compatibility. `validate-content-status.ts`
  drops the corresponding plotline → clue check and the
  faction → GM-NPC visibility check (faction pages are GM-only, so
  referencing a GM-only NPC is fine).
