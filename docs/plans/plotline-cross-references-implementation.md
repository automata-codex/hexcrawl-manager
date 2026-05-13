# Plotline Cross-References — Implementation Plan

Implements `docs/specs/plotline-cross-references-spec.md` in four reviewable parts. Each part ends in a coherent, buildable state so it can be reviewed and committed before moving on. The phase boundaries follow the spec's phase boundaries — the spec's sizing is already roughly right for "review and commit between each."

After each part: pause for manual code review + `git commit`. The user will handle data-repo edits (separate `../skyreach` repo) outside of these commits and re-run the build to confirm.

---

## Pre-flight notes (resolved from a codebase audit)

A few things the spec didn't fully cover, surfaced while scoping:

1. **Second reader of `plotline.clues` exists.** Beyond `apps/web/src/utils/clue-usage-tracker.ts`, the prebuild validator `apps/web/scripts/validate-content-status.ts:161–180` also iterates `plotline.clues`. Phase 2 must remove that block too. (The spec says to "grep for any other readers" — this is what that grep turns up.)

2. **`type: 'plotline'` in `ClueUsageReference` becomes unreachable after Phase 2.** Today it's only emitted from the `plotline.data.clues` scan (lines 282–291 of `clue-usage-tracker.ts`). NPCs/characters do not emit it. Per spec, leave the `'plotline'` arm of the union and the `getUsageUrl` case intact (cheap future-proofing). The `plotlines` *parameter* on `buildClueUsageMap` can stay (call sites in `session-toolkit/clues/index.astro` and `[id].astro` already pass it); the loop inside goes away.

3. **Body parsing for Phase 4.** The web app already depends on `remark` + `remark-gfm` (see `apps/web/src/utils/markdown.ts`). Phase 4's MDX-body parser should reuse that pipeline (parse to mdast, walk heading nodes) rather than regex-only — the spec's "regex like `/^Operatives(\s|$)/i`" applies to *which heading text matches*, not to lexing the markdown itself.

4. **Strictness-gate precedent.** `validate-content-status.ts` is the closest analogue: it always emits warnings (`process.exit(0)`) regardless. There is no existing env-var convention. Phase 4 introduces `ACHM_STRICT_PLOTLINE_REFS=1` as the gate; we can revisit unifying gating conventions later if more validators need it.

5. **Beat schema placement.** Per spec, define `PlotlineBeatStatusEnum` and `PlotlineBeatSchema` directly in `packages/schemas/src/schemas/plotline.ts`, not a separate file — they're only used by `PlotlineSchema`. Export through the package barrel (`packages/schemas/src/schemas/index.ts` already re-exports `./plotline.js` via `export *`, so no barrel edit needed; just confirm the new type names come through).

---

## Part 1 — Schema additions

**Goal:** Add the new fields. No rendering changes, no removals. All new fields optional so existing data validates unchanged.

This part corresponds to the spec's Phase 1.

### Work

- `packages/schemas/src/schemas/faction.ts`: add `plotlines: z.array(z.string()).optional()` to `FactionSchema`, with a one-line describe note ("plotline slugs this faction appears in").
- `packages/schemas/src/schemas/character.ts`: add the same `plotlines` field to `CharacterSchema`, same semantics.
- `packages/schemas/src/schemas/plotline.ts`:
  - Add `PlotlineBeatStatusEnum` (`'pending' | 'active' | 'resolved' | 'skipped'`).
  - Add `PlotlineBeatSchema` with fields exactly as the spec lists: `title`, `status` (defaults `'pending'`), optional `trigger`, optional `factions: z.array(z.string())`, optional `npcs: z.array(z.string())`, `clues: ClueReferencesSchema` (already optional inside that schema), optional `notes`.
  - Add `beats: z.array(PlotlineBeatSchema).optional()` to `PlotlineSchema`.
  - Export `PlotlineBeatData` and `PlotlineBeatStatus` types.
- Regenerate JSON schemas: `npm run build:json-schemas`. Commit the regenerated `packages/schemas/schemas/*.json` outputs alongside the source changes.
- Add a `plotline.spec.ts` (new file, sibling to `intelligence-report.spec.ts`) covering:
  - `PlotlineBeatSchema` accepts a minimal beat (`{ title: 'x' }`) and applies the `'pending'` default.
  - Accepts all optional fields populated.
  - Rejects an invalid status value.
  - Rejects a missing `title`.
- Confirm `npm run build && npm run typecheck && npm run test` pass.

### Review focus

- New fields are optional → existing data validates without changes (the data repo hasn't been touched yet).
- Beat schema shape matches spec exactly, including the `'pending'` default on status.
- JSON schema regen output is sensible (no unrelated diff churn).
- Unit tests cover the documented surface.

### Out of scope

- Reading or rendering any of these new fields.
- Removing `plotline.clues` (Part 2).
- Touching plotline body content or back-reference content (data repo only; not in this codebase).

### Commit

```
feat(schemas): add plotlines back-reference fields and PlotlineBeatSchema
```

---

## Part 2 — Remove `clues` field from `PlotlineSchema`

**Goal:** Drop the unused `clues` field on `PlotlineSchema` and clean up every reader.

This part corresponds to the spec's Phase 2, plus the second reader the spec missed.

### Work

- `packages/schemas/src/schemas/plotline.ts`: remove `clues: ClueReferencesSchema.describe(...)` from `PlotlineSchema`. Remove the now-unused `ClueReferencesSchema` import.
- `apps/web/src/utils/clue-usage-tracker.ts`:
  - Delete the "Scan plotlines" loop (lines ~282–291).
  - Update the JSDoc on `buildClueUsageMap` (line ~134) — remove "plotlines" from the list of scanned collections (the parameter stays for call-site compatibility, but the function no longer reads `plotline.data.clues`).
  - Leave the `'plotline'` arm of `ClueUsageReference['type']` and the `'plotline'` case in `getUsageUrl` (in `link-generator.ts` or wherever it lives) intact per spec.
- `apps/web/scripts/validate-content-status.ts`:
  - Delete the "Plotline clues → clue checks" block (lines ~161–180).
  - Remove the `plotlines` collection load if no longer used after the block is gone (lines ~118–121) — but only if nothing else in the file references it. (Spot-check: it's only used by that block, so it can go.)
  - Remove the `PlotlineFrontmatter` type import / inline interface if it becomes unused.
  - Update the file's top-of-file comment that references `plotline.clues[]` (line ~12) so the documented checks match reality.
- Grep `apps/ packages/` for any other readers of `plotline.data.clues` / `plotline.clues` and update them. (Audit at scoping time turned up only the two files above; re-confirm with grep before committing.)
- Existing tests: update or remove any `clue-usage-tracker` unit tests that exercised the plotline-clues scan. Confirm the rest pass.
- Regenerate JSON schemas. Confirm `npm run build && npm run typecheck && npm run test` pass.

### Data-repo audit (hand off to user)

The spec asks for an audit of `clues:` keys in plotline frontmatter so the user can do data-repo commits separately. As part of this part:

- Run `grep -l "^clues:" $ACHM_DATA_PATH/plotlines/*.md $ACHM_DATA_PATH/plotlines/*.mdx 2>/dev/null` and report the file list back to the user (no edits — that repo is separate).
- After Part 2 lands on the code side, removing those keys in the data repo is purely cosmetic (extra fields would be stripped by Zod's default `.strip()` mode anyway, so the web build doesn't break). But cleaning them up keeps the files truthful.

### Review focus

- No dangling readers of the removed field. (`rg "plotline\.(data\.)?clues"` should return zero hits outside generated JSON.)
- Clue usage tracker still surfaces clue placements from clue files (via `clue.plotlines`), characters, NPCs, encounters, etc. — only the plotline-clues path is gone.
- Validator still warns on faction → NPC issues; only the plotline → clue block is removed.
- Comment/docstring updates accurately describe the new behavior.

### Commit

```
refactor(schemas): remove unused plotline.clues field
```

---

## Part 3 — Render beats on the plotline detail page

**Goal:** Surface the new `beats` field on `/gm-reference/plotlines/[id]`. Beats render in array order; reference resolution uses the existing `(not found)` fallback pattern.

This part corresponds to the spec's Phase 3. Depends on Part 1 (`PlotlineBeatSchema`).

### Work

- `apps/web/src/pages/gm-reference/plotlines/[id].astro`:
  - Inside the frontmatter, after the linked-clues block, load the supporting collections needed for beat references:
    - `getCollection('npcs')` → build an `id → { displayName, href }` map (use `getNpcPath` from `../../../config/generated/routes`).
    - `getCollection('factions')` → same shape (use `getFactionPath`).
    - The existing `allClues` is already loaded — reuse it for beat clue references; build a quick lookup so the per-beat clue list can match the existing linked-clues row treatment (link with checkmark for `known`, fallback to `(not found)`).
  - Compute a `resolvedBeats` array up-front in the frontmatter — for each beat, eagerly resolve faction/NPC/clue references into `{ id, name, href, found: boolean }` triples, plus pass through `title`, `status`, `trigger`, `notes`. Keeps the template clean.
  - In the template, after the existing `<div class="clue-header">…</div>` and before `<Content />`, render a `<section class="beats">` if `resolvedBeats.length > 0`:
    - Section heading: `<h2 class="title is-4">Beats</h2>` (match heading sizing used elsewhere on detail pages — confirm against existing `is-3`/`is-4` usage on the page before settling).
    - For each beat:
      - `<h3>{title}</h3>` with a status `<Badge>` adjacent. Color mapping per spec:
        - `pending` → `gray`
        - `active` → `green`
        - `resolved` → `gray` with a checkmark glyph (reuse the `.checkmark` style already in this file)
        - `skipped` → `gray` plus a `muted` modifier class (use `text-decoration: line-through` and reduced opacity for visual de-emphasis).
      - If `trigger`: `<p><strong>Trigger:</strong> {trigger}</p>`.
      - If `factions.length > 0`: a `<p>` with label "Factions:" followed by inline comma-separated `<a>` links. Unresolved IDs render as plain text + `<span class="not-found">(not found)</span>` — pattern-match against any existing `(not found)` usage in the codebase first (grep for it; if there's a `MissingRef.astro` or similar component, reuse it).
      - If `npcs.length > 0`: same shape, labeled "NPCs:", linking to `getNpcPath(id)`.
      - If `clues.length > 0`: render with the existing linked-clues `<ul class="linked-clues">` treatment — link to `getCluePath(id)`, append checkmark when status is `known`, `(not found)` fallback.
      - If `notes`: render as a small markdown block. Reuse `apps/web/src/utils/markdown.ts` if it exposes a one-shot render helper; otherwise inline a simple `remark().use(remarkGfm).use(remarkHtml).processSync(notes)` and `set:html` the result. (Confirm whether `markdown.ts` already exports a function fit for this purpose during implementation.)
    - Skipped beats: same structure, with a `.beat-skipped` class on the wrapper that mutes the heading + applies the strikethrough.
  - CSS additions, scoped to the page:
    - `.beats` section spacing.
    - `.beat` wrapper with vertical rhythm between beats.
    - `.beat-skipped` muting (e.g., `opacity: 0.6; h3 { text-decoration: line-through; }`).
    - `.not-found` styling if not already global (small, muted red or gray italic).
- Manual QA: render a representative plotline page (Daemaris is the worked example referenced in the spec — once the data repo gets a beats entry on it, walk through the rendered page). For now, draft a tiny temporary YAML/MDX fixture (or set up a Vitest snapshot) to verify rendering logic ahead of the data backfill.
- `npm run build:web && npm run typecheck` pass.

### Tests

- A snapshot or component test under `apps/web/` (or a small Vitest test) that constructs a plotline `data` object with three beats — one of each status `pending`/`active`/`resolved`, plus one `skipped` — covering: (a) array-order rendering, (b) `(not found)` fallback for an invalid NPC id, (c) presence/absence of each optional field. If the existing `apps/web` test setup is too thin to support an Astro component test here, fall back to a Vitest unit test against the `resolvedBeats` builder function (extract that into a small util to make it testable).

### Review focus

- Visual integration: heading sizing harmonizes with the existing `clue-header` block; spacing feels intentional.
- Reference resolution: every link reaches the right detail page; missing IDs render `(not found)` instead of broken links.
- Beat order: array order preserved; no implicit re-sorting by status.
- Skipped beats are visible but visually de-emphasized — they don't disappear.

### Out of scope

- Deriving an NPC/faction/character list at the top of the plotline page from back-reference fields. The body remains source-of-truth (per spec).
- Cross-plotline beat aggregation views.
- Editing real plotline content to add `beats` (data-repo work).

### Commit

```
feat(web): render beats section on plotline detail page
```

---

## Part 4 — Build-time validation

**Goal:** Cross-check `plotlines` back-references against entities named in plotline bodies; flag drift. Default warn-only; flip to fail via `ACHM_STRICT_PLOTLINE_REFS=1`.

This part corresponds to the spec's Phase 4. Depends on Part 1 (the back-reference fields).

### Work

- Create `apps/web/scripts/validate-plotline-refs.ts` modeled on `validate-content-status.ts`. Reuse its `loadCollection` / `parseFrontmatter` helpers — duplicate them locally or extract into a small shared module (`apps/web/scripts/_collection-loader.ts`). Decision at implementation time; extraction is preferred if two callers exist after this part.
- Frontmatter loaders for: `plotlines`, `npcs`, `factions`, `characters`. (Plotlines are `.md` / `.mdx`; the rest are `.yaml` / `.yml`. Existing `loadCollection` parameterizes extensions already.)
- For each plotline, additionally read the raw file content (body, not just frontmatter) — `parseFrontmatter` currently throws away the body. Either:
  - Extend `parseFrontmatter` to return `{ frontmatter, body }`, or
  - Re-read the file in the plotline-walker. The first is cleaner; do it if the change is contained to this script.
- Body parsing — reuse `remark` (already a web-app dep):
  - `remark().use(remarkGfm).parse(body)` → mdast.
  - Walk `heading` nodes. For depth 2 (`##`), classify by heading text:
    - Matches `/^npcs(\s|$|:)/i` → NPC section.
    - Matches `/^(operatives|agents)(\s|$|:)/i` → NPC section (forgiving suffix handles "Operatives at Fort Dagaric").
    - Matches `/^factions(\s|$|:)/i` → faction section.
    - Matches `/^characters(\s|$|:)/i` → character section.
  - Within each classified section (i.e., until the next depth-2 heading):
    - **NPC sections:** collect depth-3 (`###`) heading texts. Each is an NPC name.
    - **Faction / character sections:** collect bulleted entries (mdast `listItem` nodes) — extract plain-text label, plus the first `link` node's URL/text if present. Markdown links of form `[Name](/gm-reference/factions/<id>)` give a direct ID; plain text falls back to name lookup.
- Build resolution maps:
  - NPCs: `displayName.toLowerCase() → id`, and `id → id` (so explicit `### faction-slug` also works as a fallback).
  - Factions: `name.toLowerCase() → id`, and `id → id`. Also consider parsing `/gm-reference/factions/<id>` URLs out of links.
  - Characters: same.
  - Resolution failure for a body-mentioned entity is itself a warning: "body section mentions 'X' but no entity found." Keep this distinct from back-ref drift warnings.
- For each plotline slug, compute:
  - `bodyEntities[plotlineSlug]` = `{ npcs: Set<id>, factions: Set<id>, characters: Set<id> }` (from parsing).
  - `backRefEntities[plotlineSlug]` = same shape (from scanning each NPC/faction/character's `plotlines: [<slug>]` field).
- Compare per-plotline:
  - **Missing back-reference** (entity in body, not in back-refs): "NPC '<displayName>' appears in body but its file doesn't list this plotline."
  - **Stale back-reference** (entity in back-refs, not in body): "NPC '<displayName>' lists this plotline but doesn't appear in the body."
- Report formatting (per spec — group by plotline, not by entity):
  ```
  Plotline: <title> (<slug>)
    Missing back-references (entity-side files need updating):
      - npc/orlin-vex
      - faction/sword-of-the-king
    Stale back-references (entity files reference this plotline, but body doesn't mention them):
      - character/daemaris
    Unresolved body mentions (typo or missing entity?):
      - "Aetherion the Unbound" — no matching NPC
  ```
- Strictness gate at the end of `main()`:
  - If `process.env.ACHM_STRICT_PLOTLINE_REFS === '1'` and warnings exist → `process.exit(1)`.
  - Otherwise → print "N plotline back-reference warning(s). Build continues." and `process.exit(0)`. (Mirror `validate-content-status.ts` wording.)
- Wire into `apps/web/scripts/prebuild.sh` as a new step before "Caching AP totals":
  ```sh
  echo ""
  echo "=== Prebuild: Validating plotline back-references ==="
  tsx scripts/validate-plotline-refs.ts
  ```

### Tests

Create `apps/web/scripts/validate-plotline-refs.spec.ts` (or wherever the existing prebuild scripts have unit tests — none of the others have unit tests today, so introduce a `.spec.ts` next to the script and confirm vitest picks it up). Cover:

- A clean plotline with body mentions and back-refs in perfect agreement → zero warnings.
- A missing back-ref: body mentions an NPC; that NPC's file lacks the plotline slug → one warning.
- A stale back-ref: NPC file references the plotline; body doesn't mention them → one warning.
- An "Operatives at Fort Dagaric" heading variant → still classified as an NPC section.
- An unresolved body mention (typo / unknown name) → distinct warning, not conflated with missing-back-ref.
- The strict-mode gate: with warnings present, `ACHM_STRICT_PLOTLINE_REFS=1` makes the runner exit non-zero; absent/unset, it exits zero.

Test strategy: refactor `validate-plotline-refs.ts` so the data loading and the analysis are separate functions (e.g., `analyzePlotlineRefs({ plotlines, npcs, factions, characters }) → Warning[]`). Tests call the analysis function with in-memory fixtures; the file-system walking and `process.exit` stay in `main()` and are exercised only manually.

### Review focus

- Heading-classification regexes handle the variations present in real plotline files. (Before running tests, eyeball `$ACHM_DATA_PATH/plotlines/*.{md,mdx}` for which `## …` headings actually exist — Daemaris is one data point; there may be others.)
- Report format readable when run by a human; entity IDs make the drift actionable.
- Strict gate flips behavior cleanly; the env-var name is documented in the script's top-of-file comment so it's discoverable.
- The validator does not block the build by default — the user wants to backfill content first, then flip the gate.

### Out of scope

- Auto-fixing drift.
- Backfilling `plotlines: [...]` fields on NPCs / factions / characters in the data repo (content work).
- Promoting beats to a standalone collection.

### Commit

```
feat(validation): cross-check plotline back-references against body content
```

---

## Summary

| Part | Scope | Approx. size | Build state at end |
|------|-------|--------------|--------------------|
| 1 | Schema fields + beat schema + unit tests + JSON regen | Small | Green; new fields unused but available |
| 2 | Remove `plotline.clues` and its two readers; comment + validator cleanup | Small | Green; clue tracker + content-status validator still work |
| 3 | Render `beats` on plotline detail page | Medium | Green; beats render once data exists |
| 4 | New prebuild validator for back-reference drift, with strict-mode gate | Medium | Green by default; warn-only until user flips gate |

### Dependencies between parts

Per spec:

```
Part 1 ──┬── Part 2  (independent of 1; ordered first for clean history)
         ├── Part 3  (needs PlotlineBeatSchema from Part 1)
         └── Part 4  (needs back-reference fields from Part 1)
```

After Part 1 is committed, Parts 2 / 3 / 4 are independent; the user may reorder review (e.g., review Part 3 first if they want the UI early). Default order follows the spec.
