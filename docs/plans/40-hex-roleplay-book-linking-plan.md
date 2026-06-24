# Implementation Plan: Link roleplay books to hexes (place-arrival surfacing)

**Spec:** `docs/specs/40-hex-roleplay-book-linking.md`
**Branch:** `region-build-out-fixes` — rides along with the in-flight beat-surfacing work
(the feature this mirrors).
**Working style:** Each Part is sized to land as **one focused commit** with a pause for
manual review. Parts are ordered so each builds and passes CI on its own; nothing later
breaks if you stop after any Part. The feature is fully live after Part 3; Part 4 wires the
real data link and docs.

This is the **same reference shape** as the just-shipped `beats` field, on the **same two
surfaces** (web hex detail + CLI movement). It is deliberately *less* work than beats in two
ways: books carry **no status/eligibility gate** (every linked book surfaces — no live-status
predicate), and we surface **title + link only** (no per-book blurb — decided with Alex), so
there is no schema change to the book itself.

---

## Two repos — read this first

- **Code repo** (`hexcrawl-manager`): Parts 1–3. Schema, loader, validation, web render, CLI
  surfacing. It *reads* book files from the data repo at runtime but adds no data there.
- **Data repo** (`../skyreach`, `ACHM_DATA_PATH=/Users/alexgs/projects/skyreach/data`):
  Part 4. The Fort Dagaric link and the CLAUDE.md pointer one-liner. **This is a separate git
  commit in a separate repository.**

Books live at `data/roleplay-books/<slug>.yml` (plain YAML, **not** Markdown frontmatter —
unlike beats). The file slug is the canonical reference: `fort-dagaric.yml` → `fort-dagaric`.
There is no `id` field in the schema; the slug *is* the ID. (`keyword` is a separate field
used only for encounter-page NPC matching — do **not** reference books by `keyword`.)

**Changeset required.** The change touches `apps/cli`, `apps/web`, `packages/schemas`, and
`packages/data`. The `Require Changeset` gate fires on `apps/`/`packages/` diffs in a PR to
`develop`. Add one with `npm run changeset` (Part 3).

---

## Decisions (confirmed — resolves the spec's "Confirm back to Alex" list)

| Question (spec) | Decision |
|---|---|
| Book reference element format — flat slug vs. compound; reuse a `'roleplay-book'` LinkType? | **Flat file-slug** (`fort-dagaric`). Field is a bare `string[]`, mirroring `beats` — **not** a `LinkType` object. **No** change to `LinkTypeEnum` (it has no `'roleplay-book'` member today and we don't need one; bare-string anchors don't use it). |
| Do books carry an active/eligibility gate, or always surface when linked? | **No gate.** Books are always-relevant reference material — every linked book surfaces. No status cache/predicate (the big simplification vs. beats). |
| Fort Dagaric hex ID + book ID for Change 3? | Hex **`v17`** (`data/hexes/col-v/v17.yaml`) → book **`fort-dagaric`**. The landmark `description` already links the book in prose; this adds the structured, surfaced link. |
| Reminder-line treatment — same block as beats, or its own labeled line? | **Its own labeled line** (spec's recommendation): `📖 Roleplay book(s) relevant here: <titles> — see hex <id>.` |
| One-line "what this book delivers" blurb on the pull surface? | **Title + link only** (decided with Alex). Books have no one-line summary field; we add none. Matches the "surface the book, not its contents" grain. |
| Change 4 docs target? | **Data repo (`../skyreach`).** The placement guide `docs/clue-and-beat-placement-guide.md` and its CLAUDE.md pointer already live there; Alex already wrote the "Linking roleplay books to hexes" section (§ at line 59) and the summary-table row naming `landmark.roleplayBooks` / `hiddenSites[].roleplayBooks`. Only a small CLAUDE.md pointer extension remains (Part 4). |

**Deferred (out of scope, per spec):** Secessa `j7` → dragonborn-diaspora book. That book
**does not exist** in `data/roleplay-books/` (confirmed: only `fort-dagaric`, `bearfolk`,
`kobolds`, `gearforged`, `alseid`). `j7` already anchors a beat
(`istavan-and-the-mask/the-refugees-lament`) but gets **no** `roleplayBooks` link in this
work. Leave it untouched; log the pending link in the PR description.

---

## What we mirror (the beats feature, verified against the code)

| Layer | Beats artifact (the template) | Roleplay-book counterpart (new) |
|---|---|---|
| Schema field | `BeatReferencesSchema` + `beats` on `BaseHiddenSiteSchema`/`LandmarkSchema` — `packages/schemas/src/schemas/hex.ts:66,80,170` | `RoleplayBookReferencesSchema` + `roleplayBooks` on the same two schemas |
| Shared loader | `packages/data/src/beats.ts` — `loadBeats()`, `parseBeatFile()` (Markdown frontmatter) | `packages/data/src/roleplay-books.ts` — `loadRoleplayBooks()`, `parseRoleplayBookFile()` (**plain YAML**) |
| Repo path | `REPO_PATHS.PLOTLINES` — `packages/data/src/repo-paths.ts` | `REPO_PATHS.ROLEPLAY_BOOKS` (add if absent) |
| Validation | `apps/web/scripts/validate-hex-beat-refs.ts` (`beatAnchorsInHex`, `loadBeatIds`) | Folded into the **same** sweep — add a roleplay-book pass |
| Web pull | `HexBeatList.svelte` + `beatMap` threaded through `GmHexDetails`→`Landmark`/`HiddenSites`; resolved in `[id].astro` | `HexRoleplayBookList.svelte` + `roleplayBookMap`, same threading (title+link only) |
| CLI push | `HexAlerts.liveBeats`, `collectHexBeatIds`, `getLiveBeatIds`, `🎭` line in `format-hex-alerts.ts` | `HexAlerts.roleplayBooks`, `collectHexRoleplayBookIds`, book-title cache, `📖` line |
| Test | `get-hex-alerts.spec-int.ts` (beat fixtures) + `beats.spec.ts` (loader) | Same files extended / mirrored |

---

# Part 1 — Schema + shared loader + reference validation (code repo)

**Goal:** Land the data foundation — the `roleplayBooks` field, a shared book loader, and the
integrity check that keeps anchors from dangling. No consumers yet; nothing surfaces. This is
the cohesive "non-UI data layer" commit (mirrors the beats `loadBeats` + validator-refactor
commits combined).

### 1a. Schema field — `packages/schemas/src/schemas/hex.ts`

- Add `RoleplayBookReferencesSchema = z.array(z.string()).optional()` next to
  `BeatReferencesSchema` (line ~66), with a doc comment mirroring the beat block's: bare
  canonical book slugs (e.g. `fort-dagaric`), one-way hex→book, no reverse `hexes` field.
- Add `roleplayBooks: RoleplayBookReferencesSchema.describe('Slugs of roleplay books reminded at this <feature>')` to:
  - `BaseHiddenSiteSchema` (line ~80, next to `beats`) — so all three hidden-site variants
    inherit it; **not** the union.
  - `LandmarkSchema` (line ~170, next to `beats`).
- Export `RoleplayBookReferencesSchema` (mirror how `BeatReferencesSchema` is exported) so it
  flows into the JSON-schema build.
- Regenerate JSON schemas: `npm run build:json-schemas`. Commit the regenerated
  `hex.schema.json` (now carries `roleplayBooks`) and the new
  `roleplay-book-references.schema.json`.

### 1b. Shared loader — `packages/data/src/roleplay-books.ts` (new)

Mirror `packages/data/src/beats.ts`, **simplified for YAML**:

- `parseRoleplayBookFile(raw: string): RoleplayBookData | null` — pure. `yaml.parse` →
  validate against `RoleplayBookSchema` (`@achm/schemas`) → return data or `null` on
  malformed/invalid. (No frontmatter extraction; books are whole-file YAML.)
- `loadRoleplayBooks(): Map<string, RoleplayBookData>` — I/O. List `*.{yml,yaml}` under
  `REPO_PATHS.ROLEPLAY_BOOKS()`, key each by **file slug** (basename without extension),
  skip files that fail to parse/validate. Uncached (callers cache, same as `loadBeats`).
- `packages/data/src/repo-paths.ts` — add `ROLEPLAY_BOOKS: () => resolveDataPath('roleplay-books')`
  to `REPO_PATHS` if not already present.
- `packages/data/src/index.ts` — export `loadRoleplayBooks`, `parseRoleplayBookFile`.
- **Unit tests** `packages/data/src/roleplay-books.spec.ts` (mirror `beats.spec.ts`): valid
  book parses; malformed YAML → `null`; schema-invalid → `null`; `loadRoleplayBooks` keys by
  slug and skips bad files.

### 1c. Reference validation — fold into the existing sweep

The spec says "fold into the existing reference-validation sweep." The existing
`apps/web/scripts/validate-hex-beat-refs.ts` already walks `landmark` + `hiddenSites[]` for a
named anchor field. Generalize it to check **both** anchor types in one pass:

- Add a `roleplayBookAnchorsInHex()` walk (or parameterize the existing `pushBeats` helper to
  take a field name), collecting `landmark.roleplayBooks` / `hiddenSites[].roleplayBooks`.
- Resolve against `new Set(loadRoleplayBooks().keys())` (mirror `loadBeatIds`).
- Report unresolved book anchors with their own message; keep the beat reporting intact.
- **Naming:** keep the filename to avoid churn, but broaden the header comment and the
  console summary to "hex → beat / roleplay-book references." (If you'd rather rename to
  `validate-hex-refs.ts`, also update the `package.json` script and `apps/web/scripts/prebuild.sh`
  line — note the rename touches two extra files. Recommendation: keep the name, broaden scope.)
- No new `prebuild.sh` line needed if folded in place (the script already runs there).

### Verify / done-when
- `npm run build` (schemas → data) clean; `npm run typecheck` clean.
- `npm test` — new `roleplay-books.spec.ts` green; existing beat tests untouched.
- `tsx apps/web/scripts/validate-hex-beat-refs.ts` runs and reports book anchors (0 today,
  until Part 4).
- **Safe to stop:** nothing surfaces yet; schema field is optional, so all existing data
  still validates.

**Commit:** `Add roleplayBooks hex field, shared book loader, and reference validation`

---

# Part 2 — Web hex-detail display (pull surface)

**Goal:** On a hex page, render the books linked at its landmark / hidden sites as a
**title + link** list, the way clues and beats already render. Mirrors commit `6a12ac4f`.

### Files
- **New** `apps/web/src/components/GmHexDetails/HexRoleplayBookList.svelte` — mirror
  `HexBeatList.svelte`, **stripped to title + link only** (no trigger/blurb). Props:
  `roleplayBooks?: string[]` (slugs), `roleplayBookMap?: Record<string, RoleplayBookMapEntry>`.
  Render `<p><strong>Roleplay books:</strong> …</p>` with each as a link via the
  `getRoleplayBookPath(slug)` route helper (`apps/web/src/config/generated/routes.ts`);
  unresolved slug → red "not found" text (mirror the beats/clues pattern).
- `apps/web/src/types.ts` — add `RoleplayBookMapEntry` (`{ id: string; name: string }`),
  mirroring `BeatMapEntry`.
- `apps/web/src/pages/session-toolkit/hexes/[id].astro` — mirror the `beatMap` block:
  - `const roleplayBooks = await getCollection('roleplay-books')` →
    `roleplayBookById` keyed by collection `id` (the file slug).
  - Collect anchored slugs from `landmark.roleplayBooks` + `hiddenSites[].roleplayBooks`
    (reuse/extend the existing `collectAnchoredBeats` walk).
  - Build `roleplayBookMap: Record<string, RoleplayBookMapEntry>` = `{ id, name }` for each
    anchored slug. Pass to `GmHexDetails`.
- `apps/web/src/components/GmHexDetails/GmHexDetails.svelte` — add `roleplayBookMap` prop;
  pass to `Landmark` and `HiddenSites` (mirror `beatMap`).
- `apps/web/src/components/GmHexDetails/Landmark.svelte` — add `roleplayBookMap` prop; render
  `HexRoleplayBookList` alongside `HexClueList`/`HexBeatList` (extend the
  `landmarkClues || landmarkBeats` length guard to include books).
- `apps/web/src/components/GmHexDetails/HiddenSites.svelte` — same, in both render variants.

### Verify / done-when
- `npm run dev`, open a hex with a `roleplayBooks` anchor (use a scratch local edit to
  `v17.yaml`, or wait for Part 4). Book renders as a working link under the landmark.
- `npm run typecheck`, `npm run lint`, `npm run build:web` clean.
- **Safe to stop:** pull surface is live; CLI push not yet wired.

**Commit:** `Display roleplay books referenced by hexes`

---

# Part 3 — CLI movement surfacing (push surface) + integration test + changeset

**Goal:** On `move` and fast-travel arrival, surface a reminder line naming the books linked
at the hex. Mirrors commit `adc4e8cb` — fold a `roleplayBooks` list into `HexAlerts` so every
existing caller (`move.ts`, fast-travel runner/plan) picks it up with **zero caller changes**.

Key difference from beats: **no live-status filter.** Resolve every linked, existing book to
its title and surface it.

### Files (`apps/cli/src/commands/scribe/lib/hex-alerts/`)
- `count-hex-alerts.ts`:
  - Add `roleplayBooks: string[]` (resolved **titles**) to `interface HexAlerts`.
  - Add `collectHexRoleplayBookIds(hex): string[]` (mirror `collectHexBeatIds` — landmark +
    object-form hidden sites; skip legacy string sites). Export it from the barrel.
  - `hasAlerts()` → also true when `roleplayBooks.length > 0`.
  - `countHexAlerts(...)` — thread the resolved titles in (resolution happens in the I/O layer
    below; the pure counter just receives them, mirroring how clue/beat predicates are passed).
- `get-hex-alerts.ts`:
  - Add a lazy `Map<slug, title>` cache built from `loadRoleplayBooks()` (`id → name`). **No**
    status predicate — books always surface.
  - In `getHexAlerts(hexId)`, resolve `collectHexRoleplayBookIds(hex)` → titles via the cache
    (drop slugs that don't resolve; the Part 1 validator is the integrity guard), set
    `alerts.roleplayBooks`.
- `format-hex-alerts.ts`:
  - `formatHexAlertLines()` → emit, when non-empty:
    `📖 Roleplay book(s) relevant here: <titles joined by ", "> — see hex <id>.`
  - `makeHexAlertNote()` → include a books clause in the session-log pause note
    (e.g. `… 1 roleplay book(s) …`), mirroring the beat clause.
- **No change** to `move.ts`, `fast-travel/plan-and-execute.ts`, or `fast-travel-runner.ts` —
  they consume `getHexAlerts` / `hasAlerts` / `formatHexAlertLines` / `makeHexAlertNote` and
  inherit books automatically (incl. the mid-route `paused_hex_alert` pause).

### Tests
- `apps/cli/src/commands/scribe/lib/hex-alerts/get-hex-alerts.spec-int.ts` — extend with a
  roleplay-book block (mirror the beat block). Add a `writeRoleplayBook(slug)` helper writing
  `REPO_PATHS.ROLEPLAY_BOOKS()/<slug>.yml`. Assert: a hex anchoring a book surfaces it
  (`alerts.roleplayBooks` has the title), `hasAlerts` is true, `formatHexAlertLines` contains
  the `📖` line; a hex with none surfaces nothing. Cover both landmark and hidden-site anchors.
- Unit-extend `count-hex-alerts.spec.ts` for `collectHexRoleplayBookIds` if it has a sibling
  beat test.

### Changeset
- `npm run changeset` — minor/patch for `@achm/schemas`, `@achm/data`, `@achm/cli`, `@achm/web`.
  Summary: "Link roleplay books to hexes; surface on hex pages and CLI arrival."

### Verify / done-when
- `npm test` (unit + int) green.
- Manual: with `v17` linked (Part 4) or a scratch fixture, `npm run cli -- scribe` → `move` to
  the hex → see the `📖` line; fast-travel through it → pause note names the book.
- **Safe to stop:** feature is fully functional against any data that has links.

**Commit:** `Surface roleplay books in CLI on arriving in a hex`

---

# Part 4 — Data link (Fort Dagaric) + docs (data repo: `../skyreach`)

**Goal:** Wire the real place-bound link and finish docs. This is a **separate commit in the
skyreach repo**, and it exercises Parts 1–3 end-to-end.

### Data
- `data/hexes/col-v/v17.yaml` — add to the `landmark` block (next to `clues`):
  ```yaml
      roleplayBooks:
        - fort-dagaric
  ```
- **Do not** touch `j7` (Secessa) — the dragonborn-diaspora book doesn't exist yet. Note the
  pending link in the commit message / PR description.

### Docs (skyreach)
- The placement guide `docs/clue-and-beat-placement-guide.md` already has the "Linking
  roleplay books to hexes" section and the field-naming table row — **no edit needed** unless
  review surfaces a gap.
- `CLAUDE.md` — in the **Clues & Beats** section (the `landmark.beats` / `hiddenSites[].beats`
  bullet, ~line 117), extend the one-liner to name the new linkable type:
  `… and a hex feature can remind a roleplay book via landmark.roleplayBooks /
  hiddenSites[].roleplayBooks (surface-as-reminder; see the placement guide).`

### Verify / done-when
- Run the validator (from the code repo, with `ACHM_DATA_PATH` pointing at skyreach):
  `tsx apps/web/scripts/validate-hex-beat-refs.ts` → `fort-dagaric` anchor resolves, 0
  unresolved.
- `npm run build:web` (or `dev`) → the Fort Dagaric hex page shows the book link.
- `npm run cli -- scribe` → `move` to `v17` shows the `📖` reminder line.

**Commit (skyreach):** `Link Fort Dagaric roleplay book to its hex; note roleplayBooks in CLAUDE.md`

---

## Suggested ordering & stop points

1. **Part 1** (code) — foundation. Build + tests green; nothing surfaces. ▢ review → commit
2. **Part 2** (code) — web pull surface live. ▢ review → commit
3. **Part 3** (code) — CLI push surface live + changeset. Feature complete in code. ▢ review → commit
4. **Part 4** (skyreach) — real link + docs; end-to-end verify. ▢ review → commit

**PR notes to capture:** the deferred `j7` diaspora-book link, and the logged-not-built
"presence-declaration" scale path from the spec's Out-of-scope section (hex declares which
faction/entity is present; books/beats/tidings derive from that one declaration) — demonstrated
need is ~2 links, so do not build it.
