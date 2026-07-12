# Plotline Cross-References — Spec

**Source threads:** "NPC creation vs. plotline development"; the Daemaris worked example.

## Context

Plotlines currently mix two kinds of cross-references with other collections:

1. **Derived** — the plotline detail page renders a list of linked clues by filtering `clue.plotlines`. Nothing in the plotline file drives this.
2. **Manual** — plotline MDX bodies contain handwritten `## NPCs`, `## Factions`, `## Characters`, and `## Clues` sections that duplicate or extend the same information.

The manual lists drift, and the terse NPC list in particular duplicates the rich "Operatives" section further down the same file. The standardization is:

- **Clues:** derived only. Drop the manual list (content-side) and the unused `plotline.clues` schema field (code-side).
- **NPCs, factions, characters on the plotline page:** the plotline file's narrative body is the source of truth for "who's in this plotline and what's their role." We do **not** derive these on the plotline page. The reverse direction (entity pages knowing which plotlines they appear in) is powered by `npc.plotlines` (already exists) and new equivalent fields on `FactionSchema` and `CharacterSchema`.
- **Beats:** a new structured field on plotlines for the sequence of dramatic beats that drive the storyline. Beats live inline in the plotline file as a list of small objects.
- **Validation:** a build-time check confirms that the entities back-linking to a plotline (via `plotlines: [<slug>]`) match the entities mentioned in the plotline file's body.

### Design decisions (not for re-litigation)

- No NPC, faction, or character list derived on the plotline detail page from back-reference fields. The body sections serve that role.
- No structured dependency field on beats. Array order handles intra-plotline sequencing; a free-text `trigger` field captures conditional flavor.
- New `plotlines` fields on faction/character are for reverse-direction rendering on *those* entities' pages and for validation — never for rendering on the plotline page.

---

## Phase 1: Schema additions

**Goal:** Add the new fields. No rendering changes, no removals.

**Work:**

- `packages/schemas/src/schemas/faction.ts`: add optional `plotlines: z.array(z.string()).optional()` field. Describe as plotline slugs this faction appears in.
- `packages/schemas/src/schemas/character.ts`: add optional `plotlines: z.array(z.string()).optional()` field with the same semantics.
- `packages/schemas/src/schemas/plotline.ts`: define `PlotlineBeatStatusEnum` and `PlotlineBeatSchema`, then add optional `beats: z.array(PlotlineBeatSchema).optional()` to `PlotlineSchema`.

  ```typescript
  export const PlotlineBeatStatusEnum = z.enum([
    'pending', 'active', 'resolved', 'skipped',
  ]);

  export const PlotlineBeatSchema = z.object({
    title: z.string(),
    status: PlotlineBeatStatusEnum.default('pending'),
    trigger: z.string().optional().describe(
      'Free-text condition for when this beat activates',
    ),
    factions: z.array(z.string()).optional().describe(
      'Faction IDs driving this beat',
    ),
    npcs: z.array(z.string()).optional().describe(
      'NPC IDs driving this beat',
    ),
    clues: ClueReferencesSchema.describe(
      'Clues associated with this beat',
    ),
    notes: z.string().optional(),
  });

  export type PlotlineBeatData = z.infer<typeof PlotlineBeatSchema>;
  export type PlotlineBeatStatus = z.infer<typeof PlotlineBeatStatusEnum>;
  ```

- Export the new schema and types from the package index.
- Regenerate JSON schemas.
- `npm run build && npm run typecheck` pass.

**Review focus:** All new fields are optional so existing data validates without changes. Beat schema shape. JSON schema regen output.

**Tests:** Unit tests for `PlotlineBeatSchema` accepting valid beats (with and without optional fields), rejecting invalid status values.

**Commit:** `feat(schemas): add plotlines back-reference fields and PlotlineBeatSchema`

---

## Phase 2: Remove `clues` field from `PlotlineSchema`

**Goal:** Drop the unused `clues` field on `PlotlineSchema` and the corresponding scan in the clue usage tracker.

**Work:**

- `packages/schemas/src/schemas/plotline.ts`: remove the `clues` field from `PlotlineSchema`.
- `apps/web/src/utils/clue-usage-tracker.ts`: remove the "Scan plotlines" block that reads `plotline.data.clues`. The `plotlines` collection is still passed to other code paths in the tracker (the `roleplay-book` usage map ignores it, but the `plotline` usage type is reachable via characters/NPCs that reference plotlines). Leave the `plotline` case in `getUsageUrl` intact.
- Grep for any other readers of `plotline.data.clues` and remove them.
- Audit existing plotline files (data repo) for `clues:` keys in frontmatter and remove them. None should affect rendering today, but they may still be in files. Hand the audit results back so I can do the data-repo commits.
- Regenerate JSON schemas.
- `npm run build && npm run typecheck` pass.

**Review focus:** No dangling readers of the removed field. Clue usage tracker still surfaces placements from clue files (via `clue.plotlines`), characters, NPCs, etc.

**Tests:** Existing clue-usage-tracker tests should still pass; remove or update any that exercised the plotline-clues scan specifically.

**Commit:** `refactor(schemas): remove unused plotline.clues field`

---

## Phase 3: Render beats on the plotline detail page

**Goal:** Surface the new `beats` field on `/gm-reference/plotlines/[id]`.

**Work:**

- `apps/web/src/pages/gm-reference/plotlines/[id].astro`: after the existing clue-header block and before the rendered markdown body, render a `Beats` section if `plotline.data.beats` is non-empty.
- For each beat:
  - Title rendered as a heading (h3).
  - Status badge using existing `Badge` component conventions:
    - `pending` → gray
    - `active` → green
    - `resolved` → muted/checkmark
    - `skipped` → strikethrough/muted
  - If `trigger` is present: render as `**Trigger:** {trigger}` or equivalent.
  - If `factions` is present: render as a list of links to faction pages, with the same "(not found)" fallback used elsewhere when the ID doesn't resolve.
  - If `npcs` is present: same treatment, linking to NPC pages.
  - If `clues` is present: render using the existing clue-link treatment (status checkmark for `known` clues, link to clue detail page).
  - If `notes` is present: render as a small block of markdown.
- Beats render in array order. Do not re-sort.
- Skipped beats may render with reduced visual prominence (muted color, smaller heading), but they are still rendered.

**Review focus:** Visual integration with the existing plotline page. Reference resolution and "(not found)" fallback for invalid IDs. Beat sort order matches YAML order.

**Tests:** Snapshot or component test that renders a plotline with a mix of beat statuses and reference validity, verifying ordering and fallback behavior.

**Commit:** `feat(web): render beats section on plotline detail page`

---

## Phase 4: Build-time validation

**Goal:** Cross-check `plotlines` back-references against the entities named in plotline bodies, flag drift.

**Work:**

- Add a new validator alongside existing prebuild validation (similar to the hex/region consistency checks). The validator runs over the plotlines, NPCs, factions, and characters collections.
- For each plotline file:
  - Parse the MDX body for section headings. Specifically:
    - Sections matching `## NPCs`, `## Operatives*`, or `## Agents*` (case-insensitive): extract `### <Name>` subheadings and resolve names against the NPC collection (by `name` field; fall back to slug-style id matching).
    - Section matching `## Factions`: extract bulleted entries or markdown links and resolve against the faction collection.
    - Section matching `## Characters`: extract similarly and resolve against the character collection.
  - For each resolved entity, compare against entities whose `plotlines: [<slug>]` includes this plotline's slug.
  - Flag both directions:
    - **Missing back-reference:** entity appears in plotline body but its file doesn't list this plotline.
    - **Stale back-reference:** entity's `plotlines` field lists this plotline but the body doesn't mention it.
- Heading parsing should be forgiving — "Operatives at Fort Dagaric" should match the operatives heuristic. Use a regex like `/^Operatives(\s|$)/i` or similar prefix matching.
- Output a per-plotline report. Group findings by plotline rather than emitting one line per entity.

**Strictness gate:**

- Default behavior: warnings only. Build does not fail.
- Strict mode: errors. Build fails on any mismatch.
- Gate via an environment variable (`ACHM_STRICT_PLOTLINE_REFS=1`) or a flag in the existing map/config file — pick whichever matches the existing prebuild-validation convention.
- I'll flip the flag on after the content backfill is complete.

**Review focus:** Heading-parsing heuristics (cover the existing variations in real plotline files; the Daemaris file uses "Operatives at Fort Dagaric"). Report format readability. Gate mechanism wired correctly.

**Tests:** Unit tests covering each heading variant, missing back-references, stale back-references, and a clean plotline file with everything in sync.

**Commit:** `feat(validation): cross-check plotline back-references against body content`

---

## Phase dependencies

```
Phase 1 ──┬── Phase 2  (independent of 1, but order matters for clean history)
          │
          ├── Phase 3  (depends on 1 — needs PlotlineBeatSchema)
          │
          └── Phase 4  (depends on 1 — needs the back-reference fields)
```

Phase 1 unblocks everything. Phases 2, 3, and 4 can be reviewed in parallel afterward.

---

## Out of scope

- Promoting beats to a standalone content collection. The schema is shaped so a migration would be mechanical if cross-plotline beat views become a regular prep tool, but we're explicitly not doing that now.
- Deriving a top-of-page NPC, faction, or character list on the plotline detail page from back-reference fields. The body is the source of truth.
- Beat dependency fields (`dependsOn`, branching). Array order handles intra-plotline sequencing; the `trigger` field captures conditional flavor.
- Content changes to plotline files (Daemaris restructuring, faction body sections, backfilling `plotlines` fields on existing NPCs/factions/characters). All content work happens outside this spec.
