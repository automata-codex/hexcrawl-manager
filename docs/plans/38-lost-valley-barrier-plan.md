# Implementation Plan: Lost Valley Barrier Hex Tag

**Spec:** `docs/specs/38-lost-valley-barrier.md`
**Branch:** `lost-valley-barrier` (off `develop`) — already checked out.
**Working style:** Each Part below is sized to land as **one focused commit** with a
pause for manual code review before moving on. Parts are ordered so each builds and
passes CI on its own; nothing later breaks if you stop after any Part.

This plan covers the spec's two scopes:

- **Scope A (Parts 1–3)** — add the tag + GM-only warning banner. Ships on its own.
- **Scope B (Parts 4–7)** — relocate the hex tag vocabulary into `tags.yaml` with a
  warnings-only validator. Builds on A.

You can stop after Part 3 and have a complete, shippable feature. Parts 4–7 are the
vocabulary-relocation follow-up folded in from `docs/specs/36-beat-tag-vocabulary.md:25`.

---

## Two repos — read this first

This feature touches **both repositories**:

- **Code repo** (`hexcrawl-manager`, where you are): Parts 1, 2, 5, 6, 7.
- **Data repo** (`../skyreach`, set via `ACHM_DATA_PATH`): Parts 3 and 4.

Confirmed data repo path this session: `/Users/alexgs/projects/skyreach`, data dir
`data/` (that's where `tags.yaml` lives). Data-repo commits use the `skip-changeset`
PR label per the usual code/data split; code-repo commits to versioned packages need a
changeset (CI gate: `.github/workflows/require-changeset.yml`).

Each data-repo Part is its own commit **in that repo** — call out the repo switch when
you pause for review so the diff lands in the right place.

---

## Codebase reality check (deltas from the spec's wording)

The spec is accurate on the core facts; these are the details verified against the code
as of this plan, plus one wiring discrepancy worth knowing before Part 6.

| Spec says / implies | Actual code (verified) |
|---|---|
| `KnownTagEnum` at `hex.ts:142` (10 tags) | ✅ Confirmed, lines 142–153. `TagSchema = z.union([KnownTagEnum, z.string()])` at line 165 — non-enforcing. |
| `KnownTag` type at `hex.ts:260` | ✅ Confirmed. Defined as `keyof z.infer<typeof KnownTagEnum>` (odd, but unused — grep shows no consumers). |
| Hex `tags` field | `HexSchema.tags = z.array(TagSchema).optional()` at `hex.ts:238`. |
| GM payload carries `tags` | ✅ `hexes.json.ts:82` spreads full `data`. `HexPlayerData` (defined `hexes.json.ts:13`) `Pick`s `'tags'` at line 25, so `currentHex?.tags?.includes(...)` type-checks. Player branches omit `tags`. |
| `GmHexDetails.svelte` `.warning` box to reuse | ✅ Lives at `apps/web/src/components/GmHexDetails/GmHexDetails.svelte`. Markup ~lines 44–53 (the "Updates" box), CSS `.warning` at lines 128–135. |
| `DetailPanel.svelte` GM gate | ✅ `canAccess(role, [SCOPES.GM])` at line 137. `currentHex` is typed `HexPlayerData`. **No `.warning` CSS exists in this component — must be ported in (Part 2).** |
| JSON schema regen | `npm run build:json-schemas` (alias `npm run gen-json-schema`). |
| `docs/api/CATALOG.md` "doc-gen step" | `npm run docs:catalog` (runs `scripts/render-api-catalog.mjs`). Regenerate, don't hand-edit. |
| **"Hook it into the same build/validate step that runs the beat validator"** (B3) | ⚠️ **The beat validator is NOT wired into the build.** `validate-tags.ts` exists only as the standalone `validate:tags` npm script — absent from `prebuild.sh` and CI (`pr-tests.yml`). **Decision (Part 6): add it to `prebuild.sh`**, which also runs the beat validator in CI for the first time. |

**`.warning` style is component-local.** `GmHexDetails.svelte` defines its own `.warning`
CSS. `DetailPanel.svelte` has none. Part 2 ports the rule into `DetailPanel.svelte`
(simplest, matches the existing per-component pattern). Promoting it to a shared global
stylesheet is optional and out of scope unless you spot an existing shared sheet.

---

## Cross-cutting: definition of done for every code-repo Part

Run before requesting review (data-only Parts 3 & 4 skip this — they run the relevant
`validate:*` against `../skyreach` instead):

```bash
npm run build          # or build:force if package outputs are stale
npm run typecheck
npm run lint
npm test               # at minimum the package(s) you touched
npm run arch:check     # dependency-cruiser boundaries
```

**Changesets:** two code-repo Parts touch `@achm/schemas` (Parts 1 and 5). Add a
changeset in each (`npm run changeset`), matching the `.changeset/*.md` format. Part 1
is a `patch` (additive enum value); Part 5 is a `patch`/`minor` refactor (runtime
behavior unchanged). Parts 2, 6, 7 touch `@achm/web` only — add a `patch` changeset if
those land as separate PRs; if the whole feature is one PR, one combined changeset is
fine. Decide your PR granularity up front.

---

# Scope A — Tag + GM-only rendering

## Part 1 — Schema: add the tag *(code repo, `@achm/schemas`)*

**Goal:** Make `lost-valley-barrier` a recognized known tag.

**Files:**
- `packages/schemas/src/schemas/hex.ts` — add `'lost-valley-barrier'` to `KnownTagEnum`
  (after `'scar-site'`, line 153).
- Generated `packages/schemas/**/hex.schema.json` — via `npm run build:json-schemas`.
- `docs/api/CATALOG.md` — via `npm run docs:catalog`.
- `.changeset/*.md` — new patch changeset for `@achm/schemas`.

**Steps:**
1. Add the enum value.
2. `npm run build:json-schemas` — confirm `hex.schema.json` now lists `lost-valley-barrier`.
3. `npm run docs:catalog` — commit the regenerated catalog diff.
4. `npm run changeset` → `@achm/schemas: patch`, message "add lost-valley-barrier hex tag".
5. Definition-of-done checks.

**Commit:** `feat(schemas): add lost-valley-barrier hex tag`

**Review focus:** generated artifacts (schema JSON, CATALOG) are regenerated, not
hand-edited; changeset present.

**Safe to stop after:** yes — additive, no behavior change.

---

## Part 2 — Web: GM-only warning banner in both views *(code repo, `@achm/web`)*

**Goal:** Render the ⚠️ banner anywhere a GM views a `lost-valley-barrier` hex. This is
the spec's Phases A2–A4 as one reviewable unit (constant + two call sites).

**Files:**
- `apps/web/src/utils/constants.ts` — add the two shared constants:
  ```ts
  export const LOST_VALLEY_BARRIER_TAG = 'lost-valley-barrier';
  export const LOST_VALLEY_BARRIER_MESSAGE =
    '⚠️ Hex is impassable. Access to the Lost Valley is only through L3 or P3. ⚠️';
  ```
- `apps/web/src/components/GmHexDetails/GmHexDetails.svelte` — conditional banner near the
  top (e.g. just before the `data-bar`), reusing the existing `.warning` class:
  ```svelte
  {#if hex.tags?.includes(LOST_VALLEY_BARRIER_TAG)}
    <p class="warning">{LOST_VALLEY_BARRIER_MESSAGE}</p>
  {/if}
  ```
  Already GM-only (rendered inside `SecretContent` on `[id].astro`). No `.astro` change.
- `apps/web/src/components/InteractiveMap/DetailPanel.svelte` — banner inside the existing
  `canAccess(role, [SCOPES.GM])` block (or gated inline), keyed off `currentHex`:
  ```svelte
  {#if canAccess(role, [SCOPES.GM]) && currentHex?.tags?.includes(LOST_VALLEY_BARRIER_TAG)}
    <p class="warning">{LOST_VALLEY_BARRIER_MESSAGE}</p>
  {/if}
  ```
  **Port the `.warning` CSS rule** (copy from `GmHexDetails.svelte` lines 128–135) into
  this component's `<style>` — it has none today.

**Steps:**
1. Add constants; import them into both components.
2. Wire the two conditionals; port the CSS into `DetailPanel.svelte`.
3. Definition-of-done checks.

**Commit:** `feat(web): show impassable warning for lost-valley-barrier hexes`

**Review focus:** both sites import the shared constant (no inline literal); the map-pane
banner is inside the GM gate; banner styling matches between the two views.

**Local visual check (optional but recommended):** `npm run dev`, then temporarily add
`tags: [lost-valley-barrier]` to a hex in your local `../skyreach` data — or wait for
Part 3 — and confirm the banner shows on both the map detail pane and `hexes/[id]` as GM,
and is absent as a player and on untagged hexes. (This is the Scope A testing checklist.)

**Safe to stop after:** yes. With no hex tagged yet, the banner simply never renders —
harmless. (Part 3 supplies the data that makes it appear.)

---

## Part 3 — Data: tag the barrier hex(es) *(DATA repo `../skyreach`)*

**Goal:** Apply the tag to the actual Lost Valley barrier hex(es) so the banner appears
in the real campaign.

**Files (data repo):** the relevant `data/hexes/*.yml` — add `lost-valley-barrier` to
each barrier hex's `tags:` list (create the field if absent). Identify the hexes that
wall off the Lost Valley (the spec's banner names L3 and P3 as the *only* access, so the
barrier hexes are the ones surrounding that access — confirm with the GM / map before
tagging).

**Steps:**
1. In `../skyreach`, edit the barrier hex YAML.
2. From the code repo, point validation at the data:
   `ACHM_DATA_PATH=/Users/alexgs/projects/skyreach npm run -w @achm/web validate:map`
   (sanity — hex YAML still validates).
3. Optionally `npm run dev` to eyeball the banner on the real hexes.

**Commit (in `../skyreach`):** `feat(data): tag Lost Valley barrier hexes` — use the
`skip-changeset` label on the PR.

**Review focus:** correct hex IDs tagged; no unrelated YAML churn.

**Safe to stop after:** yes — **Scope A is now complete and shippable.**

---

# Scope B — Relocate hex vocabulary to `tags.yaml` (with validation)

Order B after A so the warning ships first. Scope B has no user-visible effect; it moves
the source of truth for the tag vocabulary from the schema into the data repo and adds a
warnings-only validator, mirroring the existing `beat` lifecycle.

## Part 4 — Data: add the `hex` vocabulary to `tags.yaml` *(DATA repo `../skyreach`)*

**Goal:** Establish `tags.yaml` as the source of truth for hex tags, as a sibling to the
existing `beat` key.

**File (data repo):** `data/tags.yaml` — add a `hex:` key with the existing 10 tags plus
the new one:
```yaml
hex:
  - crystal-bounty
  - dungeon
  - settlement
  - dragon-ruins
  - fc-city
  - fc-ruins
  - goblin-ruins
  - haven
  - landmark-known
  - scar-site
  - lost-valley-barrier
```
(The current file already has `beat:`; append `hex:` as a sibling.)

**Commit (in `../skyreach`):** `feat(data): add hex tag vocabulary to tags.yaml` —
`skip-changeset`.

**Review focus:** list matches the enum being dropped in Part 5 exactly (same 10 + the
new one); no typos (these become the blessed vocabulary the validator checks against).

**Safe to stop after:** yes — inert until Part 6's validator reads it.

> **Why this lands before Parts 5–6:** the validator (Part 6) compares hex tags against
> this list. Seeding it first means Part 6's validator reports **zero** off-vocabulary
> tags on first run (the spec's Scope-B checklist), instead of flagging everything.

---

## Part 5 — Schema: drop the enum, make `tags.yaml` the source of truth *(code repo, `@achm/schemas`)*

**Goal:** Remove the now-redundant in-schema vocabulary. Runtime behavior is unchanged —
`TagSchema` was already non-enforcing (`z.string()` fallback accepted anything).

**Files:**
- `packages/schemas/src/schemas/hex.ts`:
  - Delete `KnownTagEnum` (lines 142–153) and the `KnownTag` type (line 260).
  - Simplify `TagSchema` (line 165) to `z.string()` — or inline `z.string()` directly in
    the `tags` field (`hex.ts:238`) and delete `TagSchema` if it has no other consumers.
    **Grep first:** `rg "TagSchema|KnownTagEnum|KnownTag\b" packages apps` — confirm only
    self-references (the spec and a fresh grep agree there are none elsewhere).
  - Net: `tags: z.array(z.string()).optional()`.
- Generated `hex.schema.json` — `npm run build:json-schemas`.
- `docs/api/CATALOG.md` — `npm run docs:catalog`.
- `.changeset/*.md` — new changeset for `@achm/schemas` (patch; behavior unchanged).

**Steps:**
1. Grep to confirm no external consumers of the removed symbols.
2. Remove enum + type; simplify `TagSchema`/`tags`.
3. Regenerate JSON schemas and CATALOG.
4. Changeset.
5. Definition-of-done checks — pay attention to `npm run typecheck` across `@achm/web`
   (Part 2 already uses the `LOST_VALLEY_BARRIER_TAG` constant, not the enum, so nothing
   should break).

**Commit:** `refactor(schemas): move hex tag vocabulary to tags.yaml`

**Review focus:** grep evidence that nothing imported the removed symbols; generated
artifacts regenerated; `hex.schema.json` `tags` is now a plain string array.

**Safe to stop after:** yes — schema is simpler, validator not yet added (that's Part 6).

---

## Part 6 — Validator: check hex tags against `tags.yaml` *(code repo, `@achm/web`)*

**Goal:** Generalize the beat-tag analyzer to cover hex tags, and run a warnings-only hex
check that mirrors the beat lifecycle (`ACHM_STRICT_TAGS=1` strict gate).

**Files:**
- `apps/web/scripts/tags-analyzer.ts` — generalize the pure core:
  - `parseBeatVocabulary(doc)` → `parseVocabulary(doc, key)`; keep a thin
    `parseBeatVocabulary = (doc) => parseVocabulary(doc, 'beat')` wrapper so the existing
    caller and tests don't churn.
  - Generalize `analyzeBeatTags(beats, vocab)` to operate on generic tagged items
    `{ id: string; tags?: string[] }`, preserving the group-by-tag, count-ordered report
    shape. Keep a `beat`-flavored wrapper or update its one caller in `validate-tags.ts`.
    (Today the analyzer builds the id as `${parentPlotlineSlug}/${slug}` — generalize to
    a precomputed `id` so hexes can pass their hex ID directly.)
- `apps/web/scripts/validate-tags.ts` (or a sibling `validate-hex-tags.ts`) — add:
  - A hex-tag loader: read `data/hexes/*.yml` via `resolveDataPath('hexes')`, parse each
    YAML, collect `{ id, tags }`. Region-defined hexes without their own file carry no
    tags — skip them.
  - A `hex`-domain check using `parseVocabulary(doc, 'hex')` + the generalized analyzer,
    warnings-only, reusing the `ACHM_STRICT_TAGS` env gate and `formatTagReport`.
- `apps/web/scripts/prebuild.sh` — add a `=== Prebuild: Validating tags ===` step running
  `tsx scripts/validate-tags.ts` (warnings-only). See decision below.

**Decision (made): wire the tag validation into `prebuild.sh`.** The spec said "hook it
into the same build/validate step that runs the beat validator," but **there is no such
step** — the beat validator (`validate:tags`) is a standalone npm script, absent from
`prebuild.sh` and CI. We are closing that gap:

- **Single script, both domains.** Extend `validate-tags.ts` to validate *both* beat and
  hex tags in one run (`validate:tags` already exists). Lowest surface area, one report.
- **Add it to `prebuild.sh`** (after the other validators) so it actually runs in CI via
  `npm run -w @achm/web build`. This makes the beat validator run in CI for the first time
  too, so **confirm the beat vocabulary is clean first** (`npm run -w @achm/web validate:tags`
  against `../skyreach`). Keep it warnings-only (no `ACHM_STRICT_TAGS` in the prebuild line,
  matching the advisory default) so a stray tag never blocks a deploy until we choose to
  flip the strict gate. Do **not** wrap it in `|| true` — warnings-only already exits 0;
  `|| true` would only mask a genuine crash in the validator.

Call out in the PR that this newly runs the (previously unwired) tag validation in CI.

**Steps:**
1. Refactor `tags-analyzer.ts` (keep beat wrappers; don't break existing tests yet).
2. Add hex loader + hex check.
3. Wire per the decision above.
4. Run it against `../skyreach`: with Part 4's vocab seeded, expect **zero** off-vocab
   hex tags. Inject a bogus tag locally to confirm it's flagged and grouped, and that
   `ACHM_STRICT_TAGS=1` exits non-zero.
5. Definition-of-done checks (existing `tags-analyzer.spec.ts` must still pass — Part 7
   extends it).

**Commit:** `feat(validation): validate hex tags against tags.yaml vocabulary`

**Review focus:** beat path unchanged (wrappers preserve behavior); hex loader correctly
skips region-only hexes; warnings-only by default; strict gate honored; wiring decision
called out.

**Safe to stop after:** yes — validator is advisory.

---

## Part 7 — Tests & docs *(code repo, `@achm/web` + docs)*

**Goal:** Lock in the generalized analyzer with tests and update the docs/follow-up trail.

**Files:**
- `apps/web/scripts/tags-analyzer.spec.ts` — extend for the generalized parser/analyzer:
  - `parseVocabulary(doc, 'hex')` extracts the hex list; missing/malformed → null (mirror
    the existing beat cases).
  - The generalized analyzer over generic `{ id, tags }` items: in-vocab passes,
    off-vocab flagged and grouped, count-ordering preserved. Keep the existing beat-shaped
    tests green (via the wrappers).
- `CLAUDE.md` — note that the hex tag vocabulary now lives in `data/tags.yaml` (alongside
  the beat note), and that the schema's `tags` field is free-form `string[]` validated by
  the warnings-only checker.
- `docs/specs/36-beat-tag-vocabulary.md` — close the line-25 follow-up (mark done /
  point at this spec & plan).

**Steps:**
1. Add/extend unit tests; `npm run -w @achm/web test`.
2. Update `CLAUDE.md` and close the spec-36 follow-up note.
3. Definition-of-done checks.

**Commit:** `test+docs: cover hex tag vocabulary relocation`

**Review focus:** tests cover both the in-vocab pass and off-vocab grouped-flag paths for
the hex domain; docs accurately describe the new source of truth.

**Safe to stop after:** yes — **Scope B (and the whole spec) complete.**

---

## Part → spec phase → commit map

| Part | Repo | Spec phase(s) | Commit |
|---|---|---|---|
| 1 | code | A1 | `feat(schemas): add lost-valley-barrier hex tag` |
| 2 | code | A2–A4 | `feat(web): show impassable warning for lost-valley-barrier hexes` |
| 3 | data | A5 | `feat(data): tag Lost Valley barrier hexes` |
| 4 | data | B1 | `feat(data): add hex tag vocabulary to tags.yaml` |
| 5 | code | B2 | `refactor(schemas): move hex tag vocabulary to tags.yaml` |
| 6 | code | B3 | `feat(validation): validate hex tags against tags.yaml vocabulary` |
| 7 | code | B4 | `test+docs: cover hex tag vocabulary relocation` |

## Final testing checklist (from the spec)

**Scope A (after Part 3):**
- [ ] `npm run typecheck && npm run lint && npm run build` clean.
- [ ] `hex.schema.json` includes `lost-valley-barrier`.
- [ ] As GM in `npm run dev`: ⚠️ banner shows on both the map detail pane and the hex
  detail page for a tagged hex.
- [ ] As a player: no banner.
- [ ] Untagged hex: no banner in either view.

**Scope B (after Part 7, additionally):**
- [ ] With `tags.yaml` `hex` key seeded (Part 4), the validator reports zero off-vocab
  hex tags.
- [ ] An injected bogus hex tag is flagged + grouped; `ACHM_STRICT_TAGS=1` fails on it.
- [ ] `npm test` passes (tags-analyzer unit tests).
- [ ] Hex YAML still validates after the enum is dropped (`validate:map`).
